import dishes from '../data/dishes.js'
import { averageDishCost } from './costCalculator'
import { getIngredientProfile } from './recipeScaler'

const mainCategories = ['Món mặn','Món kho/rim','Món xào','Món chiên/rán','Món nướng','Món hấp/luộc']
const varietySequence = ['pork','seafood','poultry','beef','egg','seafood','tofu','vegetable']
const dayNames = ['Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7','Chủ nhật']

function randomOne(items) {
  return items.length ? items[Math.floor(Math.random() * items.length)] : null
}

function mealMatches(dish, meal) {
  return String(dish.meal || '').includes(meal)
}

export function chooseTray(meal, budget, people, avoidIds = new Set(), { preferredProtein = null, avoidProteins = new Set() } = {}) {
  const eligible = dishes.filter(dish => mealMatches(dish, meal) && !avoidIds.has(dish.id))
  const mains = eligible.filter(dish => mainCategories.includes(dish.category))
  const soups = eligible.filter(dish => dish.category === 'Canh')
  const vegetables = eligible.filter(dish => dish.category === 'Rau/Củ')
  const maxTotal = Number(budget) * Number(people)
  let best = []
  let bestScore = -Infinity
  for (let attempt = 0; attempt < 160; attempt++) {
    const mainPool = mains.filter(dish => {
      const protein = getIngredientProfile(dish, people).category
      return !avoidProteins.has(protein)
    })
    const main = randomOne(mainPool.length ? mainPool : mains)
    const combo = [main, randomOne(vegetables), randomOne(soups)].filter(Boolean)
    const unique = [...new Map(combo.map(dish => [dish.id, dish])).values()]
    const cost = unique.reduce((sum, dish) => sum + averageDishCost(dish, people), 0)
    const protein = main ? getIngredientProfile(main, people).category : 'other'
    const score = (unique.length === 3 ? 100 : unique.length * 20) + (protein === preferredProtein ? 25 : 0) - (cost <= maxTotal ? 0 : (cost - maxTotal) / 10000)
    if (score > bestScore) { best = unique; bestScore = score }
    if (unique.length === 3 && cost <= maxTotal && (protein === preferredProtein || !preferredProtein)) return unique
  }
  return best
}

export function generateWeekPlan({ people = 2, budget = 80000 } = {}) {
  const usedIds = new Set()
  const usedProteins = []
  const proteinSequence = ['pork', 'seafood', 'poultry', 'beef', 'egg', 'seafood', 'tofu', 'vegetable']
  const plan = dayNames.map((day, dayIndex) => {
    const breakfastPool = dishes.filter(dish => mealMatches(dish, 'Sáng') && averageDishCost(dish, 1) <= budget && !usedIds.has(dish.id))
    const breakfast = randomOne(breakfastPool)
    if (breakfast) usedIds.add(breakfast.id)
    const makeTray = meal => {
      const preferredProtein = proteinSequence[(dayIndex * 2 + (meal === 'Tối' ? 1 : 0)) % proteinSequence.length]
      const avoidProteins = new Set(usedProteins.slice(-2))
      const tray = chooseTray(meal, budget, people, usedIds, { preferredProtein, avoidProteins })
      tray.forEach(dish => usedIds.add(dish.id))
      const main = tray.find(dish => mainCategories.includes(dish.category))
      if (main) usedProteins.push(getIngredientProfile(main, people).category)
      return tray
    }
    return { day, breakfast, lunch: makeTray('Trưa'), dinner: makeTray('Tối') }
  })
  return plan
}
