import { useEffect, useMemo, useState } from 'react'
import dishes from '../data/dishes'
import DishCard from './DishCard'
import { searchDishList, dishCuisine } from '../utils/dishSearch'
import { COOKING_METHOD_FILTERS, matchesCookingMethod } from '../utils/cookingMethod'
import { averageDishCost } from '../utils/costCalculator'

const PAGE_SIZE = 20
export default function DishCatalog({ people, likes, onLike, onSelect, today = false }) {
  const [query, setQuery] = useState('')
  const [cuisine, setCuisine] = useState('Tất cả')
  const [method, setMethod] = useState('Tất cả')
  const [meal, setMeal] = useState('Tất cả')
  const [maxCost, setMaxCost] = useState(0)
  const [count, setCount] = useState(PAGE_SIZE)
  useEffect(() => setCount(PAGE_SIZE), [query, cuisine, method, meal, maxCost])
  const results = useMemo(() => searchDishList(dishes.filter(dish => (cuisine === 'Tất cả' || dishCuisine(dish) === cuisine)
    && matchesCookingMethod(dish, method)
    && (meal === 'Tất cả' || String(dish.meal || '').includes(meal))
    && (!maxCost || averageDishCost(dish, 1) <= maxCost)), query), [query, cuisine, method, meal, maxCost])
  const visible = results.slice(0, count)
  return <section className="dish-catalog" aria-label={today ? 'Tìm và chọn món đơn' : 'Danh sách món ăn'}>
    <div className="section-title"><div><span className="eyebrow">{today ? 'TÌM VÀ CHỌN MÓN ĐƠN' : 'KHO MÓN'}</span>
      <h2>{query.trim() ? 'Kết quả tìm kiếm' : today ? 'Món gợi ý cho bạn' : 'Danh sách món ăn'}</h2></div></div>
    <div className="catalog-tools">
      <input type="search" className="search" aria-label="Tìm tên món ăn" placeholder="Tìm tên món có dấu hoặc không dấu…" value={query} onChange={e => setQuery(e.target.value)} />
      <select aria-label="Ẩm thực" value={cuisine} onChange={e => setCuisine(e.target.value)}>{['Tất cả', 'Việt Nam', 'Nước ngoài'].map(v => <option key={v}>{v}</option>)}</select>
      <select aria-label="Bữa ăn trong danh sách" value={meal} onChange={e => setMeal(e.target.value)}>{['Tất cả', 'Sáng', 'Trưa', 'Tối', 'Ăn vặt'].map(v => <option key={v}>{v}</option>)}</select>
      <select aria-label="Chi phí tối đa mỗi người" value={maxCost} onChange={e => setMaxCost(Number(e.target.value))}>
        <option value={0}>Mọi mức giá</option>{[30000, 50000, 80000, 120000, 180000].map(v => <option key={v} value={v}>≤ {v.toLocaleString('vi-VN')}đ/người</option>)}
      </select>
    </div>
    <div className="method-filter" role="group" aria-label="Phương pháp chế biến">
      {COOKING_METHOD_FILTERS.map(v => <button type="button" aria-pressed={method === v} className={method === v ? 'selected' : ''} key={v} onClick={() => setMethod(v)}>{v}</button>)}
    </div>
    <p className="muted" role="status">Hiển thị {visible.length} / {results.length} món phù hợp trong {dishes.length} món.</p>
    {results.length ? <div className="grid">{visible.map(dish => <DishCard key={dish.id} dish={dish} people={people} liked={likes.includes(dish.id)} onLike={onLike} onSelect={onSelect} compact />)}</div>
      : <div className="empty">Không tìm thấy món phù hợp. Hãy thử từ khóa khác hoặc bỏ bớt bộ lọc.{cuisine === 'Nước ngoài' && <p>Dữ liệu hiện có chưa có món được phân loại là nước ngoài.</p>}</div>}
    {visible.length < results.length && <div className="load-more"><button type="button" className="ghost" onClick={() => setCount(n => n + PAGE_SIZE)}>Tải thêm {Math.min(PAGE_SIZE, results.length - visible.length)} món</button></div>}
  </section>
}
