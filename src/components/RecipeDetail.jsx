import { getScaledRecipeItems } from '../utils/recipeScaler'

function formatAmount(value) {
  if (!Number.isFinite(value)) return 'vừa đủ'
  return Number.isInteger(value) ? value.toLocaleString('vi-VN') : value.toLocaleString('vi-VN', { maximumFractionDigits: 2 })
}

function ScaledList({ title, items }) {
  if (!items.length) return null
  return <>
    <h4>{title}</h4>
    <div className="ingredients">{items.map((item, index) => <div key={`${item.name}-${index}`}>
      <span>{item.name}</span><b>{formatAmount(item.scaledAmount)} {item.unit}</b>
    </div>)}</div>
  </>
}

export default function RecipeDetail({ dish, people = 2 }) {
  const { recipe, ingredients, seasoning } = getScaledRecipeItems(dish, people)
  return <div className="recipe-detail">
    <p className="recipe-meta">Khẩu phần chuẩn {recipe.servings || 2} người · Sơ chế {recipe.prepTime || 15} phút · Nấu {recipe.cookTime || 20} phút</p>
    {recipe.isEstimated && <p className="recipe-note">Công thức tham khảo được ước tính từ tên món; hãy kiểm tra nguyên liệu và gia vị theo thực tế.</p>}
    <ScaledList title="Nguyên liệu" items={ingredients}/>
    <ScaledList title="Gia vị" items={seasoning}/>
    <h4>Cách nấu</h4>
    <ol className="steps">{recipe.steps.map((step, index) => <li key={`${step.step || index}-${index}`}>{typeof step === 'string' ? step : step.text}</li>)}</ol>
    {recipe.tips?.length > 0 && <div className="recipe-tips"><b>Mẹo:</b> {recipe.tips.join(' ')}</div>}
  </div>
}
