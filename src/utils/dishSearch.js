export function normalizeSearch(value = '') {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, ' ').trim()
}
function nearWord(a, b) {
  if (a === b || b.startsWith(a)) return true
  if (a.length < 4 || Math.abs(a.length - b.length) > 1) return false
  const matrix = Array.from({ length: a.length + 1 }, (_, i) => [i])
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) matrix[i][j] = Math.min(matrix[i][j], matrix[i - 2][j - 2] + 1)
  }
  return matrix[a.length][b.length] <= 1
}
export function matchesDishSearch(dish, query) {
  const words = normalizeSearch(query).split(' ').filter(Boolean)
  const name = normalizeSearch(dish.name)
  if (!words.length || name.includes(words.join(' '))) return true
  const tokens = name.split(' ')
  return words.every(word => tokens.some(token => nearWord(word, token)))
}
export function dishCuisine(dish) {
  const origin = normalizeSearch(dish.cuisine || dish.country || dish.origin || '')
  if (origin) return ['viet nam', 'vietnam', 'vietnamese', 'viet'].includes(origin) ? 'Việt Nam' : 'Nước ngoài'
  // The existing dataset is documented as Vietnamese; do not infer origin from an image.
  return 'Việt Nam'
}

export function searchDishList(dishes, query) {
  const words = normalizeSearch(query).split(' ').filter(Boolean)
  if (!words.length) return dishes
  const exact = dishes.filter(dish => {
    const tokens = normalizeSearch(dish.name).split(' ')
    return words.every(word => tokens.some(token => token === word || token.startsWith(word)))
  })
  // Use typo tolerance when exact keyword results are unavailable, so a search
  // for bún thang does not mix in unrelated dishes containing Nha Trang.
  return exact.length ? exact : dishes.filter(dish => matchesDishSearch(dish, query))
}
