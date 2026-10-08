import fs from 'node:fs/promises'
import crypto from 'node:crypto'
import { normalizeDishName } from '../src/utils/dishImageResolver.js'
const root = new URL('../', import.meta.url)
const dishes = JSON.parse(await fs.readFile(new URL('src/data/dishes.json', root), 'utf8'))
const manifestFile = new URL('src/data/dish-images.json', root)
const manifest = JSON.parse(await fs.readFile(manifestFile, 'utf8'))
const rejected = JSON.parse(await fs.readFile(new URL('src/data/dish-images-rejected.json', root), 'utf8'))
const records = []
const failures = []
const used = new Map(Object.entries(manifest).map(([id, image]) => [image.originalUrl, Number(id)]))
const decode = value => String(value || '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
const normalize = value => normalizeDishName(String(value).replace(/,\s*canh$/i, ''))
function containsName(name, text) {
  return (' ' + normalize(text) + ' ').includes(' ' + normalize(name) + ' ')
}
async function request(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(15000), headers: { 'User-Agent': 'homnayangi-image-audit/1.0', Origin: 'https://toyotakimes.github.io' } })
  if (!response.ok) throw new Error('HTTP ' + response.status)
  return response
}
function meta(html, field) {
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    const attrs = Object.fromEntries([...tag.matchAll(/([\w:-]+)=["']([^"']*)["']/g)].map(m => [m[1].toLowerCase(), decode(m[2])]))
    if (attrs.property === field || attrs.name === field) return attrs.content || ''
  }
  return ''
}
await fs.mkdir(new URL('public/images/dishes/', root), { recursive: true })
await fs.mkdir(new URL('reports/', root), { recursive: true })
const inventories = ['https://cookbeo.com/sitemap.xml', 'https://bepmina.vn/post-sitemap.xml', 'https://beptruong.edu.vn/post-sitemap1.xml', 'https://beptruong.edu.vn/post-sitemap2.xml']
for (const index of ['https://www.huongnghiepaau.com/sitemap_index.xml', 'https://www.savourydays.com/sitemap_index.xml']) {
  try {
    const xml = await request(index).then(r=>r.text())
    const children = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>decode(m[1])).filter(url=>/post-sitemap/.test(url))
    inventories.push(...children.slice(0,10))
  } catch (error) { failures.push({inventory:index,error:error.message}) }
}
const pages = []
for (const inventory of inventories) {
  try {
    const xml = await request(inventory).then(r => r.text())
    pages.push(...[...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => decode(m[1])).filter(url => !url.includes('cookbeo.com') || url.includes('/recipes/')))
  } catch (error) { failures.push({ inventory, error: error.message }) }
}
const pageCache = new Map()
async function pageInfo(url) {
  if (!pageCache.has(url)) pageCache.set(url, request(url).then(r => r.text()).then(html => ({
    title: meta(html, 'og:title'), alt: meta(html, 'og:image:alt'), imageUrl: meta(html, 'og:image'),
    images: (html.match(/<img\b[^>]*>/gi) || []).map(tag => Object.fromEntries([...tag.matchAll(/([\w:-]+)=["']([^"']*)["']/g)].map(m => [m[1], decode(m[2])])))
  })))
  return pageCache.get(url)
}
for (let offset = 0; offset < dishes.length; offset += 3) {
  await Promise.all(dishes.slice(offset, offset + 3).map(async dish => {
    const candidates = pages.filter(url => containsName(dish.name, new URL(url).pathname.split('/').filter(Boolean).pop().replaceAll('-', ' ')))
    const record = { id: dish.id, name: dish.name, query: normalize(dish.name), status: 'missing', sourceInventory: inventories, candidates, issues: [] }
    const old = typeof dish.image === 'string' ? dish.image : dish.image?.url || dish.imageUrl
    if (old) record.originalImage = old
    const previous = manifest[dish.id]
    if (previous && containsName(dish.name, previous.title) && containsName(dish.name, previous.alt)) {
      try {
        await fs.access(new URL('public/' + previous.url, root))
        record.status = 'metadata-matched-local'; record.file = previous.url; record.sourceUrl = previous.sourceUrl
        records.push(record); return
      } catch { record.issues.push('Previous local image file is missing; retrying source search') }
    }
    for (const pageUrl of candidates) {
      try {
        const info = await pageInfo(pageUrl)
        const img = info.images.find(image => !rejected[image['data-src'] || image.src] && containsName(dish.name, image.alt)
          && !/nguyen lieu|so che|banner|logo|portrait|landscape|nguoi|tron bot/.test(normalize(image.alt))
          && Number(image.width) >= 400 && Number(image.height) >= 300)
        const chosenUrl = img?.['data-src'] || img?.src
        const chosenAlt = img?.alt || info.alt || ''
        if ((normalize(info.title).includes('nam dui ga') && !normalize(dish.name).includes('nam dui ga'))
          || (normalize(info.title).includes('pho ga tron') && normalize(dish.name) === 'pho ga')
          || !containsName(dish.name, info.title) || !containsName(dish.name, chosenAlt)
          || !img || !containsName(dish.name, img.alt) || !chosenUrl || !/^https:\/\//.test(chosenUrl) || /wikimedia|wikipedia/.test(chosenUrl)
          || /nguyen lieu|so che|banner|logo|portrait|landscape|nguoi|tron bot/.test(normalize(img.alt))
          || Number(img.width) < 400 || Number(img.height) < 300) {
          record.issues.push({ pageUrl, issue: 'Metadata or resolution does not confirm this exact dish', title: info.title, alt: info.alt }); continue
        }
        if (used.has(chosenUrl) && used.get(chosenUrl) !== dish.id) {
          record.issues.push({ pageUrl, issue: 'Image already assigned to another dish' }); continue
        }
        const response = await request(chosenUrl)
        const mime = response.headers.get('content-type') || ''
        if (!/^image\/(jpeg|png|webp)/.test(mime)) throw new Error('Not a raster food image: ' + mime)
        const bytes = Buffer.from(await response.arrayBuffer())
        if (bytes.length < 5000 || bytes.length > 12000000) throw new Error('Unexpected image size')
        const validMagic = bytes.subarray(0, 3).equals(Buffer.from([255,216,255])) || bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) || (bytes.toString('ascii',0,4) === 'RIFF' && bytes.toString('ascii',8,12) === 'WEBP')
        if (!validMagic) throw new Error('Invalid image bytes')
        const hash = crypto.createHash('sha256').update(bytes).digest('hex')
        if (Object.entries(manifest).some(([id, value]) => Number(id) !== dish.id && value.sha256 === hash)) { record.issues.push({ pageUrl, issue: 'Duplicate image content for another dish' }); continue }
        const extension = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg'
        const file = 'images/dishes/' + dish.id + '-' + hash.slice(0,12) + '.' + extension
        await fs.writeFile(new URL('public/' + file, root), bytes)
        manifest[dish.id] = { url: file, title: chosenAlt, alt: img.alt, pageTitle: info.title, originalUrl: chosenUrl, sourceUrl: pageUrl, source: 'recipe-page', sourceName: new URL(pageUrl).hostname, verified: true, confidence: 95, matchedBy: 'full-dish-name+page-title+image-alt', sha256: hash, width: Number(img.width), height: Number(img.height), cors: response.headers.get('access-control-allow-origin') || 'not-provided', delivery: 'same-origin-local-file', visualReview: 'pending' }
        used.set(chosenUrl, dish.id)
        record.status = 'metadata-matched-local'; record.file = file; record.sourceUrl = pageUrl; break
      } catch (error) { record.issues.push({ pageUrl, issue: error.message }); failures.push({ id: dish.id, pageUrl, error: error.message }) }
    }
    if (!candidates.length) record.issues.push('No exact dish-name match in the source recipe inventories; further sources needed')
    records.push(record)
  }))
  if (offset % 30 === 0) console.log('Audited ' + Math.min(offset + 3, dishes.length) + '/' + dishes.length + ', local images: ' + Object.keys(manifest).length)
  await fs.writeFile(manifestFile, JSON.stringify(manifest, null, 2) + '\n')
}
records.sort((a,b) => a.id - b.id)
const report = { rejectedImages: rejected, createdAt: new Date().toISOString(), total: dishes.length, originalImageCount: dishes.filter(d => d.image || d.imageUrl).length, validImages: Object.values(manifest).filter(i=>i.visualReview==='approved').length, pendingVisualReview: Object.values(manifest).filter(i=>i.visualReview!=='approved').length, rejectedImageCount: Object.keys(rejected).length, metadataMatchedLocal: records.filter(r => r.status === 'metadata-matched-local').length, missing: records.filter(r => r.status === 'missing').length, requestFailures: failures.length, visuallyVerified: Object.values(manifest).filter(i => i.visualReview === 'approved').length, complete: false, limitations: ['Only source inventory searched; missing dishes need additional sources.', 'Metadata matching does not replace visual inspection.', 'Deployment has not been verified.'], failures, records }
await fs.writeFile(new URL('reports/dish-image-audit.json', root), JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify({ total: report.total, metadataMatchedLocal: report.metadataMatchedLocal, missing: report.missing, requestFailures: report.requestFailures }))
