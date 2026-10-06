import { useEffect, useRef, useState } from 'react'
import { getVerifiedDishImage, getWikimediaImageMetadata, scoreDishImageMatch, hasRedistributableLicense } from '../utils/imageMatcher'
import { findOpenverseDishImage } from '../utils/openverseImage'

export const fallbackImage =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 520">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff7ed"/><stop offset="1" stop-color="#fed7aa"/></linearGradient></defs>
    <rect width="800" height="520" fill="url(#g)"/><circle cx="400" cy="250" r="135" fill="#fff" stroke="#fb923c" stroke-width="18"/><circle cx="400" cy="250" r="70" fill="#fdba74"/>
    <path d="M220 75v160M190 75v70M250 75v70M580 75v160" stroke="#9a3412" stroke-width="22" stroke-linecap="round"/><text x="400" y="445" text-anchor="middle" font-size="42" font-family="Arial" fill="#9a3412">Hôm Nay Ăn Gì?</text>
  </svg>`)

const IMAGE_SEARCH_VERSION = 2
const NEGATIVE_CACHE_TTL = 24 * 60 * 60 * 1000

export default function FoodImage({ dish, className = '' }) {
  const [image, setImage] = useState(null)
  const imageRef = useRef(null)
  useEffect(() => {
    let active = true
    setImage(null)
    const key = `foodimg_v4_${dish.id}`
    const cacheMiss = () => localStorage.setItem(key, JSON.stringify({ url: '', source: '', confidence: 0, verified: false, status: 'miss', searchVersion: IMAGE_SEARCH_VERSION, checkedAt: Date.now() }))
    const cached = localStorage.getItem(key)
    if (cached) {
      try {
        const entry = JSON.parse(cached)
        if (entry.status === 'miss') {
          const stillFresh = entry.searchVersion >= IMAGE_SEARCH_VERSION && Date.now() - entry.checkedAt < NEGATIVE_CACHE_TTL
          if (stillFresh) return () => { active = false }
          localStorage.removeItem(key)
        }
        const verified = entry.status !== 'miss' && entry.verified === true && entry.confidence >= 80
          ? getVerifiedDishImage({ ...dish, image: entry })
          : null
        if (verified) {
          setImage(verified)
          return () => { active = false }
        }
        localStorage.removeItem(key)
      } catch {
        localStorage.removeItem(key)
      }
    }

    const directImage = getVerifiedDishImage(dish)
    if (directImage) {
      localStorage.setItem(key, JSON.stringify(directImage))
      setImage(directImage)
      return () => { active = false }
    }

    const node = imageRef.current
    if (!node) return () => { active = false }
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return
      observer.disconnect()
      const cleanName = dish.name.replace(/,\s*canh$/i, '').trim()
      const resolveImage = async () => {
        let verified = null
        try {
          const params = new URLSearchParams({
            action: 'query', generator: 'search',
            gsrsearch: `filetype:bitmap \"${cleanName}\"`,
            gsrnamespace: '6', gsrlimit: '10', prop: 'imageinfo',
            iiprop: 'url|extmetadata', iiurlwidth: '900', format: 'json', origin: '*',
          })
          const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`)
          if (response.ok) {
            const json = await response.json()
            const pages = Object.values(json?.query?.pages || {}).sort((a, b) => a.index - b.index)
            for (const page of pages) {
              const metadata = getWikimediaImageMetadata(page)
              const match = scoreDishImageMatch(dish, metadata)
              if (!metadata.url || match.confidence < 80 || !hasRedistributableLicense(metadata.license) || !metadata.sourceUrl) continue
              verified = { ...metadata, confidence: match.confidence, verified: true, matchedBy: match.matchedBy }
              break
            }
          }
        } catch {}
        if (!verified) verified = await findOpenverseDishImage(dish)
        if (verified) {
          localStorage.setItem(key, JSON.stringify(verified))
          if (active) setImage(verified)
        } else {
          cacheMiss()
        }
      }
      resolveImage()
    }, { rootMargin: '180px' })
    observer.observe(node)
    return () => { active = false; observer.disconnect() }
  }, [dish])

  const verifiedImage = image && getVerifiedDishImage({ ...dish, image })
  const credit = verifiedImage && image.sourceUrl
    ? [image.author, image.license].filter(Boolean).join(' · ')
    : ''
  return <div className="food-image-wrap" ref={imageRef}>
    <img className={className} loading="lazy" src={verifiedImage?.url || fallbackImage}
      alt={verifiedImage ? dish.name : 'Ảnh minh họa mặc định'}
      onError={() => {
        localStorage.setItem(`foodimg_v4_${dish.id}`, JSON.stringify({ url: '', source: '', confidence: 0, verified: false, status: 'miss', searchVersion: IMAGE_SEARCH_VERSION, checkedAt: Date.now() }))
        setImage(null)
      }} />
    {credit && <a className="image-credit" href={image.sourceUrl} target="_blank" rel="noreferrer" title={`Nguồn: ${image.title}`}>
      Ảnh: {image.sourceName || image.source} · {credit}
    </a>}
  </div>
}
