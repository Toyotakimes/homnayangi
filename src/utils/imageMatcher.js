const GENERIC_TERMS = new Set(`mon viet nam kieu nau xao chien ran hap luoc nuong kho rim com an food dish món việt nam kiểu nấu xào chiên rán hấp luộc nướng kho rim cơm ăn`.split(/\s+/))
const GENERIC_MAIN_INGREDIENTS = new Set(['theo mon', 'theo dac san', 'rau cu dam', 'com mon man'])
const UNSAFE_IMAGE_TERMS = new Set(['logo', 'map', 'street', 'landscape', 'portrait', 'building', 'city', 'town', 'village', 'restaurant', 'cafe', 'person', 'people', 'poster', 'advertisement', 'screenshot', 'thumbnail', 'video', 'youtube'])
const FOOD_WORD_ALIASES = {
  pho: ['pho'], bun: ['bun', 'vermicelli', 'noodle'], mien: ['mien', 'glass noodle'], canh: ['soup'], chua: ['sour'],
  ca: ['fish', 'catfish'], loc: ['snakehead'], basa: ['basa', 'pangasius'], bo: ['beef'], ga: ['chicken'],
  heo: ['pork'], lon: ['pork'], thit: ['meat', 'pork'], tom: ['shrimp', 'prawn'], cua: ['crab'], muc: ['squid'],
  trung: ['egg'], dau: ['tofu'], com: ['rice'], rau: ['greens', 'vegetable'], banh: ['bread', 'cake'],
  tomat: ['tomato'], khoai: ['potato'], vit: ['duck'], ngan: ['duck'], nam: ['mushroom'], dua: ['coconut'], chanh: ['lime'],
}

export function normalizeImageText(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('vi')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function importantDishKeywords(dishName = '') {
  return normalizeImageText(String(dishName).replace(/,\s*canh$/i, ''))
    .split(/\s+/)
    .filter(word => word.length > 1 && !GENERIC_TERMS.has(word))
}

function metadataSources(metadata) {
  if (!metadata) return []
  if (Array.isArray(metadata)) return metadata.flatMap(metadataSources)
  if (typeof metadata === 'object') {
    const fields = ['title', 'pageTitle', 'filename', 'alt', 'description']
    return fields.map(key => ({ key, value: String(metadata[key] || '') })).filter(item => item.value)
  }
  return [{ key: 'metadata', value: String(metadata) }]
}

function allKeywordsInOrder(dishName, text) {
  const keywords = importantDishKeywords(dishName)
  if (keywords.length < 2) {
    const exactName = normalizeImageText(String(dishName).replace(/,\s*canh$/i, ''))
    return normalizeImageText(text).includes(exactName)
  }
  const normalizedText = normalizeImageText(text)
  const tokens = normalizedText.split(/\s+/)
  let next = 0
  for (const token of tokens) {
    if (token === keywords[next]) next++
    if (next === keywords.length) return true
  }
  return keywords.every(keyword => {
    const aliases = FOOD_WORD_ALIASES[keyword] || []
    return aliases.some(alias => {
      const normalizedAlias = normalizeImageText(alias)
      return normalizedText.split(/\s+/).includes(normalizedAlias) || normalizedText.includes(normalizedAlias)
    })
  })
}

export function scoreDishImageMatch(dish, metadata = '') {
  const name = dish?.name || ''
  const mainIngredient = normalizeImageText(dish?.mainIngredient || '')
  const usesSpecificMain = mainIngredient && !GENERIC_MAIN_INGREDIENTS.has(mainIngredient)
  const sources = metadataSources(metadata)
  if (!name || !sources.length) return { confidence: 0, matchedBy: '' }

  const titleMatches = sources.some(source => ['title', 'pageTitle', 'filename', 'alt'].includes(source.key)
    && allKeywordsInOrder(name, source.value)
    && (!usesSpecificMain || allKeywordsInOrder(mainIngredient, source.value))
    && !normalizeImageText(source.value).split(/\s+/).some(token => UNSAFE_IMAGE_TERMS.has(token)))
  const descriptionMatches = sources.some(source => ['description', 'alt'].includes(source.key)
    && allKeywordsInOrder(name, source.value)
    && (!usesSpecificMain || allKeywordsInOrder(mainIngredient, source.value)))
  if (!titleMatches || !descriptionMatches) return { confidence: 0, matchedBy: '' }

  for (const source of sources) {
    const tokens = normalizeImageText(source.value).split(/\s+/)
    if (['title', 'pageTitle', 'filename', 'alt'].includes(source.key) && tokens.some(token => UNSAFE_IMAGE_TERMS.has(token))) continue
    if (!allKeywordsInOrder(name, source.value)) continue
    if (usesSpecificMain && !allKeywordsInOrder(mainIngredient, source.value)) continue
    const fullName = normalizeImageText(String(name).replace(/,\s*canh$/i, ''))
    const exact = normalizeImageText(source.value).includes(fullName)
    const confidenceByField = { title: 94, pageTitle: 96, filename: 90, alt: 94, description: 92 }
    const confidence = exact ? Math.min(100, (confidenceByField[source.key] || 0) + 4) : confidenceByField[source.key] || 0
    if (confidence < 80) continue
    return { confidence, matchedBy: source.key }
  }
  return { confidence: 0, matchedBy: '' }
}

export function matchesDishImageMetadata(dishName, metadata = '', mainIngredient = '') {
  return scoreDishImageMatch({ name: dishName, mainIngredient }, metadata).confidence >= 80
}

function stripHtml(value = '') {
  return String(value).replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
}

export function getWikimediaImageMetadata(page) {
  const info = page?.imageinfo?.[0]
  const ext = info?.extmetadata || {}
  const title = String(page?.title || '').replace(/^File:/i, '')
  return {
    title: String(page?.title || '').replace(/^File:/i, ''),
    description: [ext.ObjectName?.value, ext.ImageDescription?.value, ext.Caption?.value]
      .map(stripHtml).filter(Boolean).join(' '),
    alt: stripHtml(ext.ImageDescription?.value || ext.ObjectName?.value || ''),
    url: info?.thumburl || info?.url || '',
    sourceUrl: info?.descriptionurl || '',
    author: stripHtml(ext.Artist?.value || ''),
    license: stripHtml(ext.LicenseShortName?.value || ext.UsageTerms?.value || ''),
    source: 'Wikimedia Commons',
    sourceName: 'Wikimedia Commons',
    filename: title,
    pageTitle: title,
  }
}

export function hasRedistributableLicense(license = '') {
  const value = String(license).trim()
  return /\bCC\s*(?:BY|BY-SA)(?:\s|$|\d)|\bCC0\b|Creative Commons Attribution|public domain|public-domain|PDM/i.test(value)
}

export function getVerifiedDishImage(dish) {
  const raw = dish?.image && typeof dish.image === 'object' ? dish.image : null
  const candidate = {
    url: raw?.url || dish?.imageUrl || (typeof dish?.image === 'string' ? dish.image : ''),
    source: raw?.source || dish?.imageSource || '',
    sourceName: raw?.sourceName || dish?.imageSourceName || '',
    sourceUrl: raw?.sourceUrl || dish?.imageSourceUrl || '',
    title: raw?.title || dish?.imageTitle || '',
    pageTitle: raw?.pageTitle || dish?.imagePageTitle || raw?.title || dish?.imageTitle || '',
    filename: raw?.filename || dish?.imageFilename || raw?.title || dish?.imageTitle || '',
    alt: raw?.alt || dish?.imageAlt || '',
    description: raw?.description || dish?.imageDescription || '',
    license: raw?.license || dish?.imageLicense || '',
    confidence: Number(raw?.confidence ?? dish?.imageConfidence ?? 0),
    verified: Boolean(raw?.verified ?? dish?.imageVerified),
    author: raw?.author || dish?.imageAuthor || '',
  }
  if (!candidate.url || !candidate.verified || candidate.confidence < 80) return null
  const manuallyVerified = candidate.source === 'manual' || candidate.source === 'owner-upload'
  if (!manuallyVerified) {
    const match = scoreDishImageMatch(dish, candidate)
    if (match.confidence < 80 || !hasRedistributableLicense(candidate.license) || !candidate.sourceUrl) return null
  }
  return candidate
}
