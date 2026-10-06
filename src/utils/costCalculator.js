export function parseCostRange(text = '') {
  const numbers = [...String(text).matchAll(/(\d[\d.]*)/g)]
    .map(match => Number(match[1].replaceAll('.', '')))
    .filter(Number.isFinite)
  if (!numbers.length) return { min: 30000, max: 60000 }
  if (numbers.length === 1) return { min: numbers[0], max: numbers[0] }
  return { min: Math.min(...numbers), max: Math.max(...numbers) }
}

export function estimateDishCost(dish, people = 2) {
  const hasServingBasedEstimate = Boolean(dish.estimatedCost)
  const servings = Math.max(1, Number(dish.estimatedCost?.servings) || (hasServingBasedEstimate ? Number(dish.recipe?.servings) || 1 : 1))
  const estimate = dish.estimatedCost || parseCostRange(dish.costText)
  const multiplier = Math.max(1, Number(people) || 1) / servings
  return {
    min: Math.round((Number(estimate.min) || 0) * multiplier),
    max: Math.round((Number(estimate.max) || 0) * multiplier),
  }
}

export function averageDishCost(dish, people = 1) {
  const { min, max } = estimateDishCost(dish, people)
  return Math.round((min + max) / 2)
}

export function formatMoney(amount) {
  return new Intl.NumberFormat('vi-VN').format(Math.round(amount)) + 'đ'
}
