// Exact whole-dish aliases only. Never translate ingredients independently.
export function normalizeDishName(value = '') {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, ' ').trim()
}

export const IMAGE_POLICY_VERSION = 6
const pending = new Map()
const memory = new Map()
const HIT_TTL = 7 * 24 * 60 * 60 * 1000
const MISS_TTL = 24 * 60 * 60 * 1000
const ERROR_TTL = 60 * 1000

function namesFor(dish) {
  // Aliases must be curated full names for this exact recipe/variant.
  return [...new Set([dish.name, ...(Array.isArray(dish.imageAliases) ? dish.imageAliases : [])]
    .map(normalizeDishName).filter(Boolean))]
}

export function dishImageCacheKey(dish) {
  return `foodimg_v${IMAGE_POLICY_VERSION}_${JSON.stringify([dish.id, namesFor(dish), dish.image])}`
}

function safeUrl(value) {
  try {
    const url = new URL(value, 'https://toyotakimes.github.io/homnayangi/')
    return typeof value === 'string' && value.trim() !== '' && ['https:', 'http:'].includes(url.protocol)
  } catch { return false }
}

// Old caches remain stored, but cannot supply an unverified or expired image.
function approvedImage(dish, image) {
  if (!image || !safeUrl(image.url)) return null
  if (image.source === 'themealdb') return verifyMealImage(dish, image.evidence)
  if (image.source === 'recipe-page' && image.visualReview === 'approved' && image.verified === true && image.confidence >= 80
    && /^[a-f0-9]{64}$/.test(image.sha256 || '') && image.width >= 400 && image.height >= 300
    && [image.title, image.alt, image.pageTitle].every(text =>
      (' ' + normalizeDishName(text) + ' ').includes(' ' + normalizeDishName(dish.name.replace(/,\s*canh$/i, '')) + ' '))) return image
  return manualImage({ ...dish, image })
}
function blockedUrl(dish, url) {
  return Boolean(readCache('foodimg_failed_v' + IMAGE_POLICY_VERSION + '_' + dish.id)?.urls?.includes(url))
}
export function getAvailableDishImage(dish) {
  const current = approvedImage(dish, dish.image)
  if (current && !blockedUrl(dish, current.url)) return current
  const cached = readCache(dishImageCacheKey(dish))
  if (cached?.version !== IMAGE_POLICY_VERSION || cached.expires <= Date.now()) return null
  const image = approvedImage(dish, cached.image)
  return image && !blockedUrl(dish, image.url) ? image : null
}
export function recordDishImageIssue(dish, reason, url = '') {
  const key = 'homnayangi_image_issues_v' + IMAGE_POLICY_VERSION
  const previous = readCache(key)
  const issues = previous && typeof previous === 'object' ? previous : {}
  writeCache(key, { ...issues, [dish.id]: { id: dish.id, name: dish.name, reason, url, at: new Date().toISOString() } })
}

export function verifyMealImage(dish, meal) {
  if (!meal || !namesFor(dish).includes(normalizeDishName(meal.strMeal))) return null
  if (!/^\d+$/.test(String(meal.idMeal)) || !meal.strInstructions?.trim()
    || !Array.from({ length: 20 }, (_, i) => meal[`strIngredient${i + 1}`]).some(v => v?.trim())) return null
  try {
    const url = new URL(meal.strMealThumb)
    if (url.protocol !== 'https:' || url.hostname !== 'www.themealdb.com'
      || !/^\/images\/media\/meals\/[^/]+\.(jpg|jpeg|png|webp)$/i.test(url.pathname)) return null
  } catch { return null }
  return { url: meal.strMealThumb, title: meal.strMeal, source: 'themealdb',
    sourceName: 'TheMealDB', sourceUrl: `https://www.themealdb.com/meal/${meal.idMeal}`,
    confidence: 100, verified: true, matchedBy: 'exact-dish-name', mealId: String(meal.idMeal), evidence: meal }
}

function manualImage(dish) {
  const image = dish.image
  if (!image || typeof image !== 'object' || !['manual', 'owner-upload'].includes(image.source)
    || image.verified !== true || image.confidence < 80 || !safeUrl(image.url)
    || !namesFor(dish).includes(normalizeDishName(image.title))) return null
  return image
}

async function findMealDB(dish) {
  for (const name of namesFor(dish)) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8000)
    try {
      const key = import.meta.env?.VITE_THEMEALDB_API_KEY || '1'
      const response = await fetch(`https://www.themealdb.com/api/json/v1/${encodeURIComponent(key)}/search.php?s=${encodeURIComponent(name)}`, { signal: controller.signal })
      if (!response.ok) throw new Error(`TheMealDB: ${response.status}`)
      const json = await response.json()
      if (json.meals !== null && !Array.isArray(json.meals)) throw new Error('Invalid meals response')
      const matches = (json.meals || []).map(meal => verifyMealImage(dish, meal)).filter(Boolean)
      // Ambiguous variants must be reviewed, not picked by result order.
      if (matches.length === 1) return matches[0]
    } finally { clearTimeout(timer) }
  }
  return null
}

// Add future providers here in priority order, with their own strict validators.
const providers = [findMealDB]

function readCache(key) {
  try {
    const value = localStorage.getItem(key)
    if (!value) return memory.get(key)
    try { return JSON.parse(value) } catch { return value }
  } catch { return memory.get(key) }
}
function writeCache(key, entry) {
  memory.set(key, entry)
  try { localStorage.setItem(key, JSON.stringify(entry)) } catch { /* storage is optional */ }
}
export function invalidateDishImage(dish, url) {
  const failed = url || getAvailableDishImage(dish)?.url
  const key = 'foodimg_failed_v' + IMAGE_POLICY_VERSION + '_' + dish.id
  const previous = readCache(key)?.urls || []
  if (failed) writeCache(key, { urls: [...new Set([...previous, failed])].slice(-20) })
  recordDishImageIssue(dish, 'load-error', failed)
  writeCache(dishImageCacheKey(dish), { version: IMAGE_POLICY_VERSION, image: null, expires: Date.now() + ERROR_TTL })
}

export async function resolveDishImage(dish) {
  const available = getAvailableDishImage(dish)
  if (available) return available
  const key = dishImageCacheKey(dish)
  const owned = approvedImage(dish, dish.image)
  const cached = readCache(key)
  if (cached?.version === IMAGE_POLICY_VERSION && cached.expires > Date.now()) {
    const image = cached.image
    if (!image) return null
    if (image.source === 'themealdb' && verifyMealImage(dish, image.evidence)) return verifyMealImage(dish, image.evidence)
    if (owned && image.url === owned.url && !blockedUrl(dish, image.url)) return owned
  }
  if (owned && !blockedUrl(dish, owned.url)) return owned
  if (pending.has(key)) return pending.get(key)
  const task = (async () => {
    try {
      for (const provider of providers) {
        const image = await provider(dish)
        if (image && !blockedUrl(dish, image.url)) {
          writeCache(key, { version: IMAGE_POLICY_VERSION, image, expires: Date.now() + HIT_TTL })
          return image
        }
      }
      recordDishImageIssue(dish, 'missing-verified-image')
      writeCache(key, { version: IMAGE_POLICY_VERSION, image: null, expires: Date.now() + MISS_TTL })
    } catch {
      writeCache(key, { version: IMAGE_POLICY_VERSION, image: null, expires: Date.now() + ERROR_TTL })
    }
    return null
  })().finally(() => pending.delete(key))
  pending.set(key, task)
  return task
}
