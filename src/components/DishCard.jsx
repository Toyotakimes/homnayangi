import FoodImage from './FoodImage'
import RecipeDetail from './RecipeDetail'
import { estimateDishCost, formatMoney } from '../utils/costCalculator'
import { getDishRecipe } from '../utils/recipeScaler'

export default function DishCard({ dish, onLike, liked, people = 2, compact = false }) {
  if (!dish) return null
  const cost = estimateDishCost(dish, people)
  const recipe = getDishRecipe(dish)
  return <article className={`dish-card ${compact ? 'compact' : ''}`}>
    <FoodImage dish={dish} />
    <div className="dish-body">
      <div className="dish-top">
        <span className="pill">{dish.cookingMethod || dish.category}</span>
        <button aria-label="Yêu thích" className={`heart ${liked ? 'active' : ''}`} onClick={() => onLike(dish)}>♥</button>
      </div>
      <h3>{dish.name}</h3>
      <p className="muted">{dish.meal} · {dish.costText}</p>
      <div className="cost-box"><span>Dự kiến cho {people} người</span><strong>{formatMoney(cost.min)}–{formatMoney(cost.max)}</strong></div>
      <details>
        <summary>Nguyên liệu & cách nấu · {recipe.prepTime + recipe.cookTime} phút</summary>
        <RecipeDetail dish={dish} people={people}/>
      </details>
    </div>
  </article>
}
