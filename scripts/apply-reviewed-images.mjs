import fs from 'node:fs/promises'
import { normalize } from '../src/dishLogic.mjs'
// Reviewed manually against the downloaded photo AND Commons metadata.
const approved = new Set(['bun oc', 'mien ga', 'chao long', 'bun mam', 'banh gio', 'com tam suon bi cha', 'thang co', 'banh tieu'])
const images = JSON.parse(await fs.readFile('reports/downloaded-images.json', 'utf8'))
const dishes = JSON.parse(await fs.readFile('src/data/dishes.json', 'utf8'))
const strip = value => String(value || '').replace(/<[^>]*>/g, '').replaceAll('&amp;', '&').trim()
const review = []
for (const photo of images) {
  if (!approved.has(normalize(photo.name))) {
    review.push({ name: photo.name, approved: false, reason: normalize(photo.name) === 'mien cua' ? 'Ảnh miến xào, không khớp nhóm món nước trong database.' : 'Ảnh có bàn tay người và nhãn chữ trong khung; giữ placeholder.' })
    continue
  }
  const dish = dishes.find(d => normalize(d.name) === normalize(photo.name))
  const metadata = photo.info.extmetadata
  const source = { url: `/images/${photo.file}`, title: photo.name, description: strip(metadata.ImageDescription?.value), sourcePage: photo.info.descriptionurl, author: strip(metadata.Artist?.value), license: strip(metadata.LicenseShortName?.value), licenseUrl: metadata.LicenseUrl?.value || 'https://commons.wikimedia.org/wiki/Commons:Licensing', kind: 'dish-photo', verified: true, reviewedAt: '2026-10-08', originalUrl: photo.info.url.split('?')[0] }
  dish.image = source.url
  dish.imageSources = [source]
  review.push({ name: photo.name, approved: true, source })
}
await fs.writeFile('src/data/dishes.json', JSON.stringify(dishes, null, 2) + '\n')
await fs.writeFile('reports/photo-review.json', JSON.stringify(review, null, 2) + '\n')
console.log(`Applied ${review.filter(p => p.approved).length} reviewed photos.`)
