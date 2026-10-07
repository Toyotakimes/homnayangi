export const PAGE_SIZE = 12
export const normalize = (value = '') => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim()

export function costRange(dish) {
  const values = String(dish.costText || '').match(/\d[\d.]*/g)?.map(value => Number(value.replaceAll('.', ''))) || []
  return values.length ? { min: Math.min(...values), max: Math.max(...values) } : null
}

export function mealMatches(dish, meal) {
  return meal === 'Tất cả' || normalize(dish.meal).includes(normalize(meal)) || (meal === 'Ăn vặt' && normalize(dish.category).includes('an vat'))
}

export const typeOptions = ['Tất cả', 'Xào', 'Canh', 'Luộc', 'Hấp', 'Nướng', 'Rang', 'Kho/Rim', 'Nộm', 'Chiên', 'Tráng miệng']
export function typeMatches(dish, type) {
  if (type === 'Tất cả') return true
  const name = normalize(dish.name)
  const category = normalize(dish.category)
  const patterns = { 'Kho/Rim': /\b(kho|rim)\b/, 'Nộm': /\b(goi|nom)\b/, 'Chiên': /\b(chien|ran)\b/ }
  if (type === 'Tráng miệng') return normalize(dish.meal).includes('trang mieng')
  if (patterns[type]) return patterns[type].test(`${name} ${category}`)
  if (typeOptions.includes(type)) return new RegExp(`\\b${normalize(type)}\\b`).test(name)
  return dish.category === type
}

export function filterDishes(dishes, { meal = 'Tất cả', budget = Infinity, search = '', type = 'Tất cả' } = {}) {
  const query = normalize(search)
  return dishes.filter(dish => mealMatches(dish, meal) && typeMatches(dish, type)
    && (budget === Infinity || (costRange(dish)?.max ?? Infinity) <= budget)
    && (!query || normalize(dish.name).includes(query)))
}

export function shuffle(list, random = Math.random) {
  const result = [...list]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

// Prices are ranges. Reserve the lower estimates of all three courses first,
// then allocate remaining budget toward each range's midpoint.
export function createTray(dishes, { meal, budget, people }, random = Math.random) {
  const eligible = dishes.filter(dish => mealMatches(dish, meal) && costRange(dish))
  const order = list => random === null ? list : shuffle(list, random)
  const soups = order(eligible.filter(dish => dish.category === 'Canh'))
  const vegetables = order(eligible.filter(dish => dish.category === 'Rau/Củ'))
  const mains = order(eligible.filter(dish => /^Món /.test(dish.category)))
  if (!soups.length || !vegetables.length || !mains.length) return []
  const cost = dish => costRange(dish).min * people
  const cheapestSoup = Math.min(...soups.map(cost))
  const cheapestVeg = Math.min(...vegetables.map(cost))
  const totalBudget = budget * people
  const main = mains.find(dish => cost(dish) + cheapestSoup + cheapestVeg <= totalBudget)
  if (!main) return []
  const soup = soups.find(dish => cost(main) + cost(dish) + cheapestVeg <= totalBudget)
  const veg = vegetables.find(dish => cost(main) + cost(soup) + cost(dish) <= totalBudget)
  let remaining = budget - [main, veg, soup].reduce((sum, dish) => sum + costRange(dish).min, 0)
  return [main, veg, soup].map(dish => {
    const { min, max } = costRange(dish)
    const extra = Math.min(remaining, Math.floor((max - min) / 2))
    remaining -= extra
    return { ...dish, estimatedCostPerPerson: min + extra }
  })
}

export function auditData(dishes) {
  const generic = /theo mon|theo phong cach|dung do chin|theo thu tu chin|nau com;|nau nuoc dung hoac/
  return {
    total: dishes.length,
    missingPrices: dishes.filter(d => !costRange(d)).length,
    missingIngredients: dishes.filter(d => !d.mainIngredient || normalize(d.mainIngredient) === 'theo mon').length,
    missingMethods: dishes.filter(d => !d.method).length,
    genericMethods: dishes.filter(d => generic.test(normalize(d.method))).length,
    missingCategoryOrMeal: dishes.filter(d => !d.category || !d.meal).length,
    missingCookingTime: dishes.filter(d => !d.cookTimeMinutes).length,
  }
}
