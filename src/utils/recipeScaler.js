import { featuredRecipes } from '../data/recipes/featured.js'

const genericIngredientName = /^(theo món|theo đặc sản|rau\/củ \+ đạm|cơm \+ món mặn)$/i

export function scaleIngredient(ingredient, servings = 2, people = 2) {
  const baseServings = Math.max(1, Number(servings) || 1)
  const guests = Math.max(1, Number(people) || 1)
  const amount = Number(ingredient.amount)
  return {
    ...ingredient,
    scaledAmount: Number.isFinite(amount) ? amount * guests / baseServings : null,
  }
}

function guessMainIngredient(dish) {
  const provided = String(dish.mainIngredient || '').trim()
  if (provided && !genericIngredientName.test(provided)) return provided
  const name = dish.name.replace(/,\s*(canh)$/i, '').trim()
  const specifics = [
    [/thịt ba chỉ|ba chỉ/, 'Thịt ba chỉ'], [/thịt bằm|thịt băm|thịt xay/, 'Thịt bằm'],
    [/cá basa/, 'Cá basa'], [/cá lóc/, 'Cá lóc'], [/cá thu/, 'Cá thu'], [/cá rô/, 'Cá rô'], [/cá/, 'Cá'],
    [/hến/, 'Hến'], [/ngao|nghêu/, 'Ngao'], [/mực/, 'Mực'], [/ốc/, 'Ốc'], [/sò/, 'Sò'], [/tôm/, 'Tôm'], [/cua/, 'Cua'], [/ghẹ/, 'Ghẹ'],
    [/rau muống/, 'Rau muống'], [/rau ngót/, 'Rau ngót'], [/rau đay/, 'Rau đay'], [/mồng tơi/, 'Mồng tơi'], [/rau dền/, 'Rau dền'],
    [/cải xanh/, 'Cải xanh'], [/cải ngọt/, 'Cải ngọt'], [/cải thìa/, 'Cải thìa'], [/cải cúc/, 'Cải cúc'], [/bí đỏ/, 'Bí đỏ'], [/bí xanh/, 'Bí xanh'], [/khoai mỡ/, 'Khoai mỡ'], [/khoai sọ/, 'Khoai sọ'], [/mướp/, 'Mướp'], [/su su/, 'Su su'],
    [/đậu phụ|đậu hũ/, 'Đậu phụ'], [/thịt|sườn|giò heo|chân giò/, 'Thịt heo'],
  ]
  return specifics.find(([pattern]) => pattern.test(name))?.[1] || name
}

function inferredRecipe(dish) {
  const name = dish.name.replace(/,\s*(canh)$/i, '').trim()
  const main = guessMainIngredient(dish)
  const isSoup = dish.category === 'Canh'
  const isNoodle = /phở|bún|miến|hủ tiếu|mì quảng|bánh canh/i.test(name)
  const isRice = /cơm|xôi/i.test(name)
  const isEgg = /trứng/i.test(main)
  const isVegetable = /rau|cải|su su|bí|mướp|bông cải|đậu cô ve|khoai mỡ|khoai sọ/i.test(main) && !isSoup
  const isStirFry = /xào/i.test(name) || dish.category === 'Món xào'
  const isBraise = /kho|rim/i.test(name) || dish.category === 'Món kho/rim'
  const isFried = /chiên|rán/i.test(name) || dish.category === 'Món chiên/rán'
  const isGrilled = /nướng|quay/i.test(name) || dish.category === 'Món nướng'
  const isSteamed = /hấp/i.test(name)
  const isBoiled = /luộc/i.test(name) || dish.category === 'Món hấp/luộc'
  const hasSecondaryProtein = /thịt|bò|bê|gà|vịt|tôm|cá|trứng|mực|cua/i.test(name)
  const vegetableName = name.match(/rau muống|rau ngót|rau đay|mồng tơi|rau dền|cải xanh|cải thìa|cải ngọt|cải cúc|cần tỏi|bông cải|rau củ|bí xanh|bí đỏ|bầu|mướp|khoai mỡ|khoai sọ|su su|đậu cô ve|cà chua|dưa chua|rong biển|khế|củ quả/i)?.[0]
  const amount = isEgg ? 3 : isVegetable ? 300 : isSoup ? 250 : 350
  const unit = isEgg ? 'quả' : 'g'
  const ingredients = [{ name: main, amount, unit }]
  const secondaryIngredients = [
    [/thịt ba chỉ|ba chỉ/, 'Thịt ba chỉ', 180], [/thịt bằm|thịt băm|thịt xay/, 'Thịt bằm', 150],
    [/(^|[^\p{L}])bò([^\p{L}]|$)/u, 'Thịt bò', 150], [/gà/, 'Thịt gà', 150],
    [/(^|[^\p{L}])cá([^\p{L}]|$)/u, 'Cá', 180], [/tôm/, 'Tôm', 120], [/trứng/, 'Trứng gà', 2, 'quả'],
    [/đậu phụ|đậu hũ/, 'Đậu phụ', 180],
  ]
  if (isSoup || isStirFry || isRice) secondaryIngredients.forEach(([pattern, itemName, itemAmount, itemUnit = 'g']) => {
    if (pattern.test(name) && !pattern.test(main)) ingredients.push({ name: itemName, amount: itemAmount, unit: itemUnit })
  })
  if (isSoup) {
    if (vegetableName) ingredients.push({ name: vegetableName.charAt(0).toLocaleUpperCase('vi') + vegetableName.slice(1), amount: 250, unit: 'g' })
    ingredients.push({ name: 'Nước lọc hoặc nước dùng', amount: 700, unit: 'ml' })
  } else if (vegetableName && (isStirFry || isRice || isNoodle) && !main.toLocaleLowerCase('vi').includes(vegetableName.toLocaleLowerCase('vi'))) {
    ingredients.push({ name: vegetableName.charAt(0).toLocaleUpperCase('vi') + vegetableName.slice(1), amount: 200, unit: 'g' })
  }
  if (isNoodle) ingredients.push({ name: 'Bún/phở/miến khô', amount: 160, unit: 'g' })
  if (isRice) ingredients.push({ name: 'Gạo tẻ', amount: 180, unit: 'g' })
  if (isSoup) ingredients.push({ name: 'Hành tím', amount: 1, unit: 'củ' })
  else ingredients.push({ name: 'Hành tím hoặc tỏi', amount: 2, unit: 'tép' })
  const seasoning = [
    { name: 'Nước mắm', amount: 1.5, unit: 'muỗng canh' },
    { name: 'Muối', amount: 0.5, unit: 'muỗng cà phê' },
    { name: 'Đường', amount: 1, unit: 'muỗng cà phê' },
    { name: 'Tiêu', amount: 0.25, unit: 'muỗng cà phê' },
  ]
  let steps
  if (isSoup) steps = [
    `Rửa sạch ${main}; thái hoặc băm vừa ăn. Nhặt, rửa rau củ của món và để ráo.`,
    'Phi thơm hành tím với 1 thìa cà phê dầu; cho phần đạm vào đảo 2–3 phút đến khi săn.',
    'Đổ nước vào nồi, đun sôi rồi hớt bọt. Hạ lửa vừa và nấu 8–12 phút cho nguyên liệu chín.',
    'Cho rau củ vào theo độ lâu chín; nấu thêm 3–5 phút để rau vừa mềm và còn màu tươi.',
    'Nêm nước mắm, muối và đường từng ít một; nếm lại, rắc tiêu/hành rồi tắt bếp.',
  ]
  else if (isNoodle) steps = [
    `Rửa và sơ chế ${main}; thái lát hoặc chia phần vừa ăn. Chuẩn bị rau thơm và hành.`,
    'Nấu nguyên liệu làm nước dùng với khoảng 1 lít nước trong 20–30 phút; thường xuyên hớt bọt để nước trong.',
    'Nêm nước dùng từ từ bằng nước mắm, muối và đường; nếm đến khi vị vừa miệng.',
    'Luộc/chần bún hoặc bánh theo hướng dẫn trên gói, xả nhanh nước nóng và chia vào tô.',
    'Xếp phần đạm và rau lên trên, chan nước dùng đang sôi; dùng nóng cùng gia vị ăn kèm.',
  ]
  else if (isRice) steps = [
    'Vo gạo 1–2 lần, thêm lượng nước theo loại gạo và nấu chín; để cơm nguội bớt nếu dùng để rang.',
    `Sơ chế ${main} và các nguyên liệu đi kèm; cắt miếng vừa ăn, thấm khô nguyên liệu cần chiên/rang.`,
    'Làm nóng chảo ở lửa vừa, thêm 1 thìa canh dầu; phi thơm hành tỏi rồi cho phần đạm vào đảo đến khi chín.',
    'Cho rau/củ hoặc cơm vào chảo; đảo đều 3–5 phút để nóng và quyện với phần đạm.',
    'Nêm nước mắm, muối, đường vừa ăn; đảo thêm 1 phút, tắt bếp và dùng nóng.',
  ]
  else if (isEgg) steps = [
    'Đập trứng vào bát, đánh tan cùng nước mắm và tiêu; thái nhỏ hành lá nếu có.',
    'Làm nóng chảo chống dính ở lửa vừa, cho 1 thìa cà phê dầu và tráng đều đáy chảo.',
    'Đổ trứng vào chảo; nghiêng chảo để trứng dàn đều, hạ lửa nhỏ để mặt dưới vàng mà không cháy.',
    'Khi mặt trên gần se, gấp đôi hoặc lật nhẹ; chiên thêm 30–60 giây đến khi trứng chín.',
    'Tắt bếp, cắt miếng vừa ăn và dùng ngay khi còn nóng.',
  ]
  else if (isVegetable && !hasSecondaryProtein) steps = [
    `Rửa sạch ${main}, để ráo và cắt miếng đồng đều để rau chín cùng lúc.`,
    'Đun sôi nồi nước với một nhúm muối; cho rau vào luộc 2–4 phút tùy độ non.',
    'Gắp rau ra ngay khi vừa chín tới; nếu xào, phi thơm tỏi rồi đảo rau ở lửa lớn 2–3 phút.',
    'Nêm nước mắm hoặc muối vừa ăn; đảo nhẹ để gia vị phủ đều mà không làm nát rau.',
    'Tắt bếp và dùng nóng; không nấu quá lâu để rau giữ màu và độ giòn.',
  ]
  else if (isStirFry) steps = [
    `Sơ chế ${main}, thái miếng mỏng vừa ăn; rửa sạch và cắt phần rau/củ của món. Thấm khô nguyên liệu.`,
    'Ướp phần đạm với một nửa nước mắm, tiêu và chút đường trong 10 phút.',
    'Làm nóng chảo lớn ở lửa lớn, thêm 1 thìa canh dầu; phi thơm hành tỏi khoảng 20–30 giây.',
    'Cho phần đạm vào xào nhanh đến khi săn và gần chín; nếu chảo nhỏ, xào từng mẻ để không ra nhiều nước.',
    'Cho rau/củ vào, đảo liên tục 2–4 phút; thêm phần gia vị còn lại và nếm lại.',
    'Khi rau vừa chín tới và thịt chín hoàn toàn, tắt bếp; dùng nóng.',
  ]
  else if (isBraise) steps = [
    `Rửa sạch ${main}, để ráo và cắt miếng đồng đều. Băm hành/tỏi; ướp nguyên liệu với nước mắm, đường và tiêu 15 phút.`,
    'Làm nóng nồi/chảo ở lửa vừa với 1 thìa cà phê dầu; phi thơm hành tỏi rồi cho nguyên liệu vào áp săn các mặt.',
    'Thêm 100–150 ml nước nóng và phần gia vị còn lại; đun sôi rồi hạ lửa nhỏ, đậy hé nắp.',
    'Kho liu riu 15–25 phút tùy nguyên liệu, thỉnh thoảng lắc nồi hoặc trở mặt để thấm đều.',
    'Mở nắp, nếm lại; đun thêm đến khi nguyên liệu chín và nước kho sánh vừa bám quanh món.',
    'Tắt bếp, rắc tiêu/hành lá nếu có và dùng nóng.',
  ]
  else if (isFried) steps = [
    `Rửa sạch ${main}, cắt miếng vừa ăn và thấm khô kỹ; thấm khô giúp hạn chế dầu bắn.`,
    'Ướp với muối, tiêu và một ít nước mắm trong 10–15 phút; để ráo phần nước ướp trước khi chiên.',
    'Làm nóng chảo với lượng dầu đủ phủ đáy ở lửa vừa; thử dầu bằng một mẩu nguyên liệu nhỏ.',
    'Cho nguyên liệu vào chảo thành một lớp, chiên từng mẻ; không đảo ngay, đợi mặt dưới vàng rồi mới lật.',
    'Chiên đến khi các mặt vàng và phần bên trong chín hoàn toàn; gắp ra giấy thấm dầu.',
    'Nếm lại, rắc tiêu/hành nếu phù hợp và dùng nóng.',
  ]
  else if (isGrilled) steps = [
    `Rửa sạch ${main}, thấm khô. Trộn nước mắm, đường, tiêu và gia vị với nguyên liệu; ướp ít nhất 20 phút.`,
    'Làm nóng lò/nồi chiên ở 190°C trong 5 phút; quét một lớp dầu mỏng lên khay hoặc vỉ.',
    'Xếp nguyên liệu thành một lớp, nướng 10–15 phút tùy độ dày; lật giữa chừng và quét phần sốt ướp.',
    'Tiếp tục nướng đến khi bề mặt vàng thơm và phần giữa chín hoàn toàn; tránh để cháy cạnh.',
    'Lấy món ra nghỉ 2–3 phút, nếm lại gia vị và dùng nóng.',
  ]
  else if (isSteamed) steps = [
    `Rửa sạch ${main}, để ráo; khía nhẹ miếng dày để gia vị thấm. Ướp với nước mắm, gừng/hành và tiêu 10 phút.`,
    'Đun sôi nước trong nồi hấp; chỉ đặt xửng lên khi hơi nước đã bốc mạnh.',
    'Xếp nguyên liệu vào đĩa chịu nhiệt, đặt lát gừng/hành lên trên rồi hấp có đậy nắp.',
    'Hấp khoảng 12–20 phút tùy nguyên liệu và kích thước; kiểm tra phần dày nhất đã chín.',
    'Rưới nước hấp/sốt lên món, thêm hành lá và dùng ngay khi còn nóng.',
  ]
  else if (isBoiled) steps = [
    `Rửa sạch ${main}, cắt/chia phần đồng đều. Đun nồi nước với một nhúm muối và gừng/hành nếu phù hợp.`,
    'Khi nước sôi, cho nguyên liệu vào; hạ lửa vừa để nước sôi lăn tăn, không trào.',
    'Luộc 5–20 phút tùy nguyên liệu; trở đều nếu miếng lớn và hớt bọt khi cần.',
    'Kiểm tra phần dày nhất đã chín hoàn toàn rồi vớt ra để ráo; rau thì vớt ngay khi vừa mềm.',
    'Nêm nước chấm riêng, thái/chặt món sau khi nghỉ vài phút và dùng nóng.',
  ]
  else steps = [
    `Rửa sạch ${main}, thấm khô và cắt thành miếng vừa ăn; băm nhỏ hành/tỏi.`,
    'Ướp nguyên liệu với một nửa lượng nước mắm, đường và tiêu trong 15 phút.',
    'Làm nóng chảo/nồi ở lửa vừa, thêm 1 thìa canh dầu; phi thơm hành tỏi khoảng 30 giây.',
    'Cho nguyên liệu vào áp chảo/đảo đến khi săn và vàng đều; hạ lửa nhỏ để bên trong chín.',
    'Thêm phần gia vị còn lại và 2–3 thìa canh nước; đậy hé nắp, nấu 8–12 phút, thỉnh thoảng đảo.',
    'Mở nắp, nếm và điều chỉnh gia vị; nấu đến khi nguyên liệu chín hoàn toàn, sốt sánh thì tắt bếp.',
  ]
  return {
    servings: 2,
    prepTime: isNoodle ? 20 : 15,
    cookTime: isNoodle ? 35 : 20,
    ingredients,
    seasoning,
    steps: steps.map((text, index) => ({ step: index + 1, text })),
    tips: isSoup ? ['Cho rau vào gần cuối để giữ màu xanh và không bị nhũn.'] : ['Nêm gia vị từng ít một rồi nếm lại trước khi tắt bếp.'],
    isEstimated: true,
  }
}

export function getDishRecipe(dish) {
  const nameKey = dish.name.normalize('NFC').toLocaleLowerCase('vi').replace(/,\\s*canh$/i, '').trim()
  return dish.recipe?.steps?.length ? dish.recipe : featuredRecipes[dish.id] || featuredRecipes[nameKey] || inferredRecipe(dish)
}

export function getScaledRecipeItems(dish, people) {
  const recipe = getDishRecipe(dish)
  return {
    recipe,
    ingredients: (recipe.ingredients || []).map(item => scaleIngredient(item, recipe.servings, people)),
    seasoning: (recipe.seasoning || []).map(item => scaleIngredient(item, recipe.servings, people)),
  }
}

export function getIngredientProfile(dish, people = 2) {
  const recipe = getDishRecipe(dish)
  const source = recipe.ingredients?.[0]
  const scaled = source ? scaleIngredient(source, recipe.servings, people) : null
  return {
    name: source?.name || guessMainIngredient(dish),
    category: ingredientCategory(dish, source?.name || ''),
    amount: scaled?.scaledAmount ?? 0,
    unit: source?.unit || 'g',
  }
}

export function ingredientCategory(dish, ingredientName = '') {
  const text = `${ingredientName} ${dish.name}`.toLocaleLowerCase('vi')
  if (/(^|[^\p{L}])cá([^\p{L}]|$)|tôm|mực|cua|ghẹ|ngao|hến|ốc|sứa|hải sản/u.test(text)) return 'seafood'
  if (/gà|vịt|ngan/.test(text)) return 'poultry'
  if (/heo|lợn|thịt bằm|thịt băm|ba chỉ|sườn|chân giò/.test(text)) return 'pork'
  if (/(^|[^\p{L}])bò([^\p{L}]|$)|bê/u.test(text)) return 'beef'
  if (/trứng/.test(text)) return 'egg'
  if (/đậu/.test(text)) return 'tofu'
  if (/rau|cải|bí|mướp|nấm|củ|su su|cà chua/.test(text)) return 'vegetable'
  return 'other'
}
