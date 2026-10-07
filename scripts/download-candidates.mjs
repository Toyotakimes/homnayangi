import fs from 'node:fs/promises'
import { normalize } from '../src/dishLogic.mjs'
const candidates = JSON.parse(await fs.readFile('reports/image-candidates.json', 'utf8')).filter(p => p.imageinfo)
const manifest = []
for (const candidate of candidates) {
  const info = candidate.imageinfo[0]
  const name = candidate.title.replace(/^File:/, '').replace(/\.jpg$/i, '')
  const file = normalize(name).replace(/[^a-z0-9]+/g, '-') + '.jpg'
  const remote = info.url.split('?')[0]
  try {
    try { await fs.access(`public/images/${file}`) } catch {
      const response = await fetch(remote, { signal: AbortSignal.timeout(20000) })
      if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) throw new Error(`HTTP ${response.status}`)
      await fs.writeFile(`public/images/${file}`, Buffer.from(await response.arrayBuffer()))
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    manifest.push({ name, file, remote, info, title: candidate.title })
  } catch (error) { console.log(`${name}: ${error.message}`) }
}
await fs.writeFile('reports/downloaded-images.json', JSON.stringify(manifest, null, 2))
console.log(`Downloaded ${manifest.length} candidate photos; not yet approved.`)
