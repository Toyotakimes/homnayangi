// Exact-title discovery for every dish. Candidates require manual visual review.
import fs from 'node:fs/promises'
const dishes = JSON.parse(await fs.readFile(new URL('../src/data/dishes.json', import.meta.url), 'utf8'))
const candidates = []
for (let i = 0; i < dishes.length; i += 40) {
  const batch = dishes.slice(i, i + 40)
  const query = new URLSearchParams({ action: 'query', format: 'json', titles: batch.map(d => `File:${d.name}.jpg`).join('|'), prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '800' })
  try {
    const response = await fetch(`https://commons.wikimedia.org/w/api.php?${query}`, { headers: { 'User-Agent': 'HomnayangiImageAudit/1.0' }, signal: AbortSignal.timeout(15000) })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.json()
    candidates.push(...Object.values(data.query.pages).filter(p => p.imageinfo))
  } catch (error) { candidates.push({ error: error.message, names: batch.map(d => d.name) }) }
}
await fs.writeFile(new URL('../reports/image-candidates.json', import.meta.url), JSON.stringify(candidates, null, 2))
console.log(JSON.stringify({ dishesAudited: dishes.length, candidates: candidates.filter(p => p.imageinfo).length, failedBatches: candidates.filter(p => p.error).length }))
