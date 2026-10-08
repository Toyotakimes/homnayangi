import fs from 'node:fs/promises'
import sharp from 'sharp'
const manifest = JSON.parse(await fs.readFile('src/data/dish-images.json', 'utf8'))
const dishes = JSON.parse(await fs.readFile('src/data/dishes.json', 'utf8'))
const records = []
for (const [id, image] of Object.entries(manifest)) {
  try {
    const file = 'public/' + image.url
    const meta = await sharp(file).metadata()
    await sharp(file).stats()
    records.push({ id: Number(id), name: dishes.find(d => d.id === Number(id)).name, ...image, decoded: true, actualWidth: meta.width, actualHeight: meta.height })
  } catch (error) { records.push({ id: Number(id), decoded: false, error: error.message }) }
}
await fs.mkdir('reports/image-contact-sheets', { recursive: true })
for (let offset = 0; offset < records.length; offset += 20) {
  const subset = records.slice(offset, offset + 20)
  const tiles = []
  for (let index = 0; index < subset.length; index++) {
    const item = subset[index]
    if (!item.decoded) continue
    const x = index % 4 * 300, y = Math.floor(index / 4) * 220
    const photo = await sharp('public/' + item.url).resize(290,180,{ fit:'inside' }).toBuffer()
    const name = item.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[&<>]/g,'')
    const label = Buffer.from('<svg width="300" height="36"><rect width="300" height="36" fill="white"/><text x="5" y="20" font-size="13" font-family="Arial">' + item.id + ': ' + name + '</text></svg>')
    tiles.push({ input: photo, left: x + 5, top: y + 5 },{ input:label,left:x,top:y+184 })
  }
  await sharp({ create:{width:1200,height:1100,channels:3,background:'#ffffff'} }).composite(tiles).png().toFile('reports/image-contact-sheets/batch-' + (offset + 1) + '.png')
}
await fs.writeFile('reports/local-image-check.json', JSON.stringify({ total: records.length, decoded: records.filter(r=>r.decoded).length, errors: records.filter(r=>!r.decoded), records },null,2))
console.log(JSON.stringify({total:records.length,decoded:records.filter(r=>r.decoded).length,errors:records.filter(r=>!r.decoded).length}))
