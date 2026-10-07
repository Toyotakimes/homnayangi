import { importantDishKeywords, normalizeImageText, scoreDishImageMatch } from './imageMatcher.js'

const ALLOWED_LICENSES = new Set(['by', 'by-sa', 'cc0', 'pdm'])
const GENERIC_MAIN_INGREDIENTS = new Set(['theo mon', 'theo dac san', 'rau cu dam', 'com mon man'])
const FOOD_TAGS = new Set(['food', 'foods', 'dish', 'dishes', 'meal', 'meals', 'cuisine', 'noodle', 'noodles', 'soup', 'rice', 'beef', 'pork', 'chicken', 'fish', 'seafood', 'vegetable', 'vegetables', 'egg', 'eggs', 'bread', 'dessert', 'snack', 'pho', 'bun', 'com', 'banh'])
const UNSAFE_TAGS = new Set(['logo', 'map', 'street', 'landscape', 'portrait', 'building', 'city', 'town', 'village', 'poster', 'advertisement', 'screenshot', 'thumbnail', 'video', 'youtube', 'selfie', 'person', 'people'])
const KEYWORD_ALIASES = {
  pho: ['pho', 'noodle', 'noodles'], bun: ['bun', 'vermicelli', 'noodle', 'noodles'], mien: ['mien', 'glass noodle', 'noodle'],
  bo: ['bo', 'beef'], ca: ['ca', 'fish', 'catfish'], basa: ['basa', 'pangasius'], loc: ['loc', 'snakehead'],
  ga: ['ga', 'chicken'], heo: ['heo', 'pork'], thit: ['thit', 'meat', 'pork'], tom: ['tom', 'shrimp', 'prawn'],
  cua: ['cua', 'crab'], muc: ['muc', 'squid'], trung: ['trung', 'egg'], dau: ['dau', 'tofu'],
  canh: ['canh', 'soup'], chua: ['chua', 'sour'], banh: ['banh', 'cake', 'bread'], com: ['com', 'rice'],
}
let lastRequestAt = 0
let requestQueue = Promise.resolve()

const wait = duration => new Promise(resolve => setTimeout(resolve, duration))

function normalizedTags(result) {
  return (result.tags || []).map(tag => normalizeImageText(tag?.name || tag))
    .filter(Boolean)
}

function keywordInTag(keyword, tags) {
  const aliases = KEYWORD_ALIASES[keyword] || [keyword]
  return tags.some(tag => aliases.some(alias => {
    const normalizedAlias = normalizeImageText(alias)
    return tag === normalizedAlias || tag.includes(normalizedAlias.replaceAll(' ', '')) || tag.includes(normalizedAlias)
  }))
}

function tagsConfirmDish(dish, tags) {
  if (!tags.length || tags.some(tag => tag.split(/\s+/).some(token => UNSAFE_TAGS.has(token)))) return false
  const keywords = importantDishKeywords(dish.name)
  const mainText = normalizeImageText(dish.mainIngredient || '')
  const main = GENERIC_MAIN_INGREDIENTS.has(mainText) ? [] : importantDishKeywords(dish.mainIngredient || '')
  const specificMain = main.length > 0
  const compactName = keywords.join('')
  const compoundNameTag = tags.some(tag => tag.replace(/\s+/g, '').includes(compactName))
  const matchingKeywords = compoundNameTag ? keywords : keywords.filter(word => keywordInTag(word, tags))
  const foodContext = tags.some(tag => tag.split(/\s+/).some(token => FOOD_TAGS.has(token)))
  const mainMatches = specificMain && main.every(word => keywordInTag(word, tags))
  const minimumMatches = keywords.length <= 2 ? 1 : 2
  return foodContext && (mainMatches || matchingKeywords.length >= minimumMatches)
}

function publicLicenseName(license, version) {
  const names = { by: 'CC BY', 'by-sa': 'CC BY-SA', cc0: 'CC0', pdm: 'Public Domain Mark' }
  return `${names[license] || license}${version ? ` ${version}` : ''}`
}

function asVerifiedImage(dish, result) {
  const tags = normalizedTags(result)
  const tagText = tags.join(' ')
  const metadata = {
    title: result.title || '',
    pageTitle: result.title || '',
    filename: result.title || '',
    alt: result.title || '',
    description: `${result.title || ''} ${tagText}`,
  }
  const match = scoreDishImageMatch(dish, metadata)
  if (match.confidence < 80 || !tagsConfirmDish(dish, tags)) return null
  const license = normalizeImageText(result.license).replaceAll(' ', '-')
  if (!ALLOWED_LICENSES.has(license) || !result.url || !result.foreign_landing_url) return null
  return {
    url: result.url,
    source: 'openverse',
    sourceName: `Openverse · ${result.provider || result.source || 'Creative Commons'}`,
    sourceUrl: result.foreign_landing_url,
    title: result.title,
    pageTitle: result.title,
    filename: result.title,
    alt: result.title,
    description: `${result.title || ''} ${tagText}`,
    tags,
    license: publicLicenseName(license, result.license_version),
    licenseUrl: result.license_url || '',
    author: result.creator || '',
    confidence: Math.min(match.confidence, 92),
    verified: true,
    matchedBy: `title+${match.matchedBy}+tags`,
  }
}

async function fetchOpenverse(query) {
  const params = new URLSearchParams({
    q: `\"${query}\"`,
    page_size: '10',
    license: 'by,by-sa,cc0,pdm',
  })
  const response = await fetch(`https://api.openverse.org/v1/images/?${params}`)
  if (!response.ok) throw new Error(`Openverse image search failed: ${response.status}`)
  return response.json()
}

function throttledSearch(query) {
  const task = requestQueue.then(async () => {
    const delay = Math.max(0, 3200 - (Date.now() - lastRequestAt))
    if (delay) await wait(delay)
    lastRequestAt = Date.now()
    return fetchOpenverse(query)
  })
  requestQueue = task.catch(() => {})
  return task
}

export async function findOpenverseDishImage(dish) {
  const dishName = dish.name.replace(/,\s*canh$/i, '')
  const query = normalizeImageText(dishName)
  const translatedQuery = importantDishKeywords(dishName)
    .map(word => (KEYWORD_ALIASES[word] || [word]).find(alias => alias !== word) || word)
    .join(' ')
  const queries = [...new Set([query, translatedQuery].filter(Boolean))]
  for (const searchQuery of queries) {
    try {
      const json = await throttledSearch(searchQuery)
      const results = json.results || []
      const candidates = results
        .filter(result => (result.fields_matched || []).includes('title'))
        .map(result => asVerifiedImage(dish, result))
        .filter(Boolean)
        .sort((a, b) => b.confidence - a.confidence)
      if (candidates.length) return candidates[0]
    } catch {
      return null
    }
  }
  return null
}
