import { normalize } from './dishLogic.mjs'

export const IMAGE_VERSION = '2026-10-08-v2'
// Only reviewed dish photos are eligible; keyword matching alone is not approval.
export function verifiedImages(dish) {
  return (dish.imageSources || []).filter(source => {
    if (!source.verified || !source.sourcePage || !source.title || source.kind !== 'dish-photo') return false
    const words = [...new Set(normalize(dish.name).split(/\s+/))]
    const metadata = normalize(`${source.title} ${source.description || ''}`)
    return words.every(word => new RegExp(`\\b${word}\\b`).test(metadata))
  })
}

export function imageUrl(url) {
  const resolved = url.startsWith('/images/') ? `${import.meta.env?.BASE_URL || '/'}${url.slice(1)}` : url
  return `${resolved}${resolved.includes('?') ? '&' : '?'}v=${IMAGE_VERSION}`
}
