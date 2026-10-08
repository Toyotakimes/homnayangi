import { useEffect, useRef, useState } from 'react'
import { dishImageCacheKey, getAvailableDishImage, resolveDishImage, invalidateDishImage } from '../utils/dishImageResolver'

export const fallbackImage =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 520">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff7ed"/><stop offset="1" stop-color="#fed7aa"/></linearGradient></defs>
    <rect width="800" height="520" fill="url(#g)"/><circle cx="400" cy="250" r="135" fill="#fff" stroke="#fb923c" stroke-width="18"/><circle cx="400" cy="250" r="70" fill="#fdba74"/>
    <path d="M220 75v160M190 75v70M250 75v70M580 75v160" stroke="#9a3412" stroke-width="22" stroke-linecap="round"/><text x="400" y="445" text-anchor="middle" font-size="42" font-family="Arial" fill="#9a3412">Hôm Nay Ăn Gì?</text>
  </svg>`)

export default function FoodImage({ dish, className = '' }) {
  const [resolved, setResolved] = useState(null)
  const [failedUrl, setFailedUrl] = useState(null)
  const imageRef = useRef(null)
  const key = dishImageCacheKey(dish)
  useEffect(() => {
    let active = true
    setResolved({ key, image: getAvailableDishImage(dish) })
    setFailedUrl(null)
    const load = () => {
      resolveDishImage(dish).then(image => {
        if (active) setResolved({ key, image })
      })
    }
    const node = imageRef.current
    if (!node || typeof IntersectionObserver === 'undefined') {
      load()
      return () => { active = false }
    }
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return
      observer.disconnect()
      load()
    }, { rootMargin: '180px' })
    observer.observe(node)
    return () => { active = false; observer.disconnect() }
  }, [key])

  const candidate = resolved?.key === key ? resolved.image : getAvailableDishImage(dish)
  const image = candidate?.url === failedUrl ? null : candidate
  return <div className="food-image-wrap" ref={imageRef}>
    <img className={className} loading="lazy" src={image?.url || fallbackImage}
      alt={image ? dish.name : `${dish.name} — chưa có ảnh thực tế được xác minh`}
      onError={image ? () => {
        invalidateDishImage(dish, image.url)
        setFailedUrl(image.url)
      } : undefined} />
    {!image && <span className="image-missing-label">Chưa có ảnh thực tế</span>}
    {image?.sourceUrl && <a className="image-credit" href={image.sourceUrl}
      target="_blank" rel="noreferrer" title={`Nguồn: ${image.title}`}>
      Ảnh: {image.sourceName || image.source}
      {image.license ? ` · ${image.license}` : ''}
    </a>}
  </div>
}
