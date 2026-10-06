export const COOKING_METHOD_FILTERS = [
  'Tất cả', 'Xào', 'Canh', 'Luộc', 'Hấp', 'Nướng', 'Rang', 'Nộm/Gỏi', 'Chiên/Rán',
  'Kho/Rim', 'Hầm', 'Om', 'Món nước', 'Trộn', 'Lẩu', 'Cháo', 'Cơm',
  'Bún/Phở/Miến', 'Bánh', 'Ăn vặt', 'Tráng miệng',
]

const normalize = value => String(value || '').normalize('NFC').toLocaleLowerCase('vi')

export function inferCookingMethod(dish) {
  const name = normalize(dish.name).replace(/,\s*canh$/i, '').replace(/chấm kho quẹt/g, '')
  const category = normalize(dish.category)
  const meal = normalize(dish.meal)

  if (/bánh canh/.test(name)) return 'Món nước'
  if (/(^|\s)canh\s/.test(`${name} `) || category === 'canh') return 'Canh'
  if (/lẩu/.test(name) || category.includes('lẩu')) return 'Lẩu'
  if (/cháo/.test(name) || category.includes('cháo')) return 'Cháo'
  if (/nộm|gỏi/.test(name) || category.includes('gỏi') || category.includes('nộm')) return 'Nộm/Gỏi'
  if (/hầm/.test(name)) return 'Hầm'
  if (/\bom\b|om\s/.test(name)) return 'Om'
  if (/thui|lụi|đốt|gác bếp|pa pỉnh tộp/.test(name)) return 'Nướng'
  if (/chả chìa/.test(name)) return 'Nướng'
  if (/chả cá lã vọng/.test(name)) return 'Chiên/Rán'
  if (/ram|nem cua bể|chả ram/.test(name)) return 'Chiên/Rán'
  if (/tré|nhút|nậm pịa|nem phùng|tái chanh/.test(name)) return 'Trộn'
  if (/thắng cố|khâu nhục/.test(name)) return 'Hầm'
  if (/súp|măng chua nấu cá/.test(name)) return 'Món nước'
  if (/xôi/.test(name)) return 'Cơm'
  if (/xào/.test(name) || category === 'món xào') return 'Xào'
  if (/kho|rim/.test(name) || category === 'món kho/rim') return 'Kho/Rim'
  if (/rang/.test(name)) return 'Rang'
  if (/nướng|quay/.test(name) || category === 'món nướng') return 'Nướng'
  if (/chiên|rán/.test(name) || category === 'món chiên/rán') return 'Chiên/Rán'
  if (/hấp/.test(name) || category === 'món hấp/luộc' && !/luộc/.test(name)) return 'Hấp'
  if (/luộc/.test(name) || category === 'món hấp/luộc') return 'Luộc'
  if (/trộn/.test(name)) return 'Trộn'
  if (/phở|bún|miến|hủ tiếu|bánh canh|mì quảng|cao lầu/.test(name)) return 'Món nước'
  if (/cơm/.test(name) || category.startsWith('cơm/')) return 'Cơm'
  if (/chè|kem|sữa chua|rau câu|thạch|pudding|trái cây|hoa quả/.test(name) || category.includes('chè')) return 'Tráng miệng'
  if (/ăn vặt/.test(category) || meal.includes('ăn vặt')) return 'Ăn vặt'
  if (/bánh/.test(name) || category.includes('bánh')) return 'Bánh'

  if (category === 'canh') return 'Canh'
  if (category === 'món xào') return 'Xào'
  if (category === 'món chiên/rán') return 'Chiên/Rán'
  if (category === 'món nướng') return 'Nướng'
  if (category === 'món hấp/luộc') return 'Hấp'
  if (category === 'món kho/rim') return 'Kho/Rim'
  if (category.includes('ăn vặt')) return 'Ăn vặt'
  return 'Khác'
}

export function matchesCookingMethod(dish, filter) {
  if (!filter || filter === 'Tất cả') return true
  const method = dish.cookingMethod || inferCookingMethod(dish)
  const name = normalize(dish.name)
  const category = normalize(dish.category)
  const meal = normalize(dish.meal)

  if (filter === 'Bún/Phở/Miến') return /phở|bún|miến|hủ tiếu|bánh canh|mì quảng|cao lầu/.test(name)
  if (filter === 'Món nước') return method === 'Món nước' || matchesCookingMethod(dish, 'Bún/Phở/Miến')
  if (filter === 'Cơm') return method === 'Cơm' || /cơm/.test(name) || category.startsWith('cơm/')
  if (filter === 'Bánh') return method === 'Bánh' || /bánh/.test(name) || category.includes('bánh')
  if (filter === 'Ăn vặt') return method === 'Ăn vặt' || category.includes('ăn vặt') || meal.includes('ăn vặt')
  if (filter === 'Tráng miệng') return method === 'Tráng miệng'
  return method === filter
}
