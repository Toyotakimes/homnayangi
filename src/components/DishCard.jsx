import { useRef } from 'react'
import FoodImage from './FoodImage'
import RecipeDetail from './RecipeDetail'
import { estimateDishCost, formatMoney } from '../utils/costCalculator'
import { getDishRecipe } from '../utils/recipeScaler'

export default function DishCard({ dish, onLike, liked, people = 2, compact = false, onSelect }) {
  const detailRef = useRef(null)
  const showRecipe = () => { if (detailRef.current) detailRef.current.open = !detailRef.current.open }
  if (!dish) return null
  const cost = estimateDishCost(dish, people)
  const recipe = getDishRecipe(dish)
  return <article className={`dish-card ${compact ? 'compact' : ''}`} onClick={event => { if (!event.target.closest('button, a, details, input, select')) showRecipe() }}>
    <FoodImage dish={dish} />
    <div className="dish-body">
      <div className="dish-top">
        <span className="pill">{dish.cookingMethod || dish.category}</span>
        <button aria-label="Yêu thích" className={`heart ${liked ? 'active' : ''}`} onClick={() => onLike(dish)}>♥</button>
      </div>
      <h3><button type="button" className="dish-title-button" onClick={showRecipe} aria-label={`Xem công thức ${dish.name}`}>{dish.name}</button></h3>
      <p className="dish-category">{dish.category}</p>
      <p className="muted">{dish.meal} · {dish.costText}</p>
      <div className="cost-box"><span>Dự kiến cho {people} người</span><strong>{formatMoney(cost.min)}–{formatMoney(cost.max)}</strong></div>
      <p className="recipe-meta">Thời gian chế biến: {recipe.prepTime + recipe.cookTime} phút</p>
      {onSelect && <div className="dish-actions"><button type="button" className="ghost" onClick={showRecipe}>Xem chi tiết công thức</button><button type="button" className="primary" onClick={() => onSelect(dish)}>Chọn món</button></div>}
      <details ref={detailRef}>
        <summary>Nguyên liệu & cách nấu · {recipe.prepTime + recipe.cookTime} phút</summary>
        <RecipeDetail dish={dish} people={people}/>
      </details>
    </div>
  </article>
}
