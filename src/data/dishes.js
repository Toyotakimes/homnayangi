import rawDishes from './dishes.json'
import { inferCookingMethod } from '../utils/cookingMethod'

function normalizeImage(dish) {
  const rawImage = dish.image && typeof dish.image === 'object' ? dish.image : null
  const url = rawImage?.url || dish.imageUrl || (typeof dish.image === 'string' ? dish.image : '')
  const confidence = Number(rawImage?.confidence ?? dish.imageConfidence ?? 0)
  const verified = Boolean(rawImage?.verified ?? dish.imageVerified) && confidence >= 80
  if (!url || !verified) return null
  return {
    url,
    source: rawImage?.source || dish.imageSource || 'manual',
    sourceName: rawImage?.sourceName || dish.imageSourceName || '',
    sourceUrl: rawImage?.sourceUrl || dish.imageSourceUrl || '',
    title: rawImage?.title || dish.imageTitle || '',
    alt: rawImage?.alt || dish.imageAlt || '',
    description: rawImage?.description || dish.imageDescription || '',
    license: rawImage?.license || dish.imageLicense || '',
    confidence,
    verified,
    pageTitle: rawImage?.pageTitle || rawImage?.title || dish.imagePageTitle || '',
    filename: rawImage?.filename || rawImage?.title || dish.imageFilename || '',
    tags: rawImage?.tags || dish.imageTags || [],
    author: rawImage?.author || dish.imageAuthor || '',
    licenseUrl: rawImage?.licenseUrl || dish.imageLicenseUrl || '',
    matchedBy: rawImage?.matchedBy || '',
  }
}

// Enrich records at the data boundary so the original 1,000-row JSON remains intact.
const dishes = rawDishes.map(dish => {
  const image = normalizeImage(dish)
  return {
    ...dish,
    cookingMethod: dish.cookingMethod || inferCookingMethod(dish),
    image,
    imageUrl: image?.url || '',
    imageSource: image?.source || '',
    imageSourceName: image?.sourceName || '',
    imageSourceUrl: image?.sourceUrl || '',
    imageLicense: image?.license || '',
    imageConfidence: image?.confidence || 0,
    imageVerified: Boolean(image?.verified),
  }
})

export default dishes
