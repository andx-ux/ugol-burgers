/*
 * ТОВАРЫ МЕНЮ — правьте этот файл, чтобы добавить, убрать или изменить позицию.
 * Ничего больше трогать не нужно: карточки на странице собираются из этого
 * списка автоматически при загрузке сайта.
 *
 * КАК ДОБАВИТЬ НОВЫЙ ТОВАР
 * 1. Скопируйте один блок { ... } целиком (вместе с фигурными скобками)
 *    и вставьте его в список MENU_ITEMS ниже. После предыдущего блока
 *    должна остаться запятая.
 * 2. Придумайте свой id — латиницей, без пробелов, ни у кого не повторяется,
 *    например 'triple-cheese'.
 * 3. Заполните поля:
 *      category — 'burgers', 'sides' или 'drinks'
 *                 (от этого зависит, под какой кнопкой-фильтром появится товар)
 *      name     — название, которое увидит гость
 *      tag      — короткое описание под названием
 *      price    — цена в рублях, только число, без "₽"
 *      weight   — вес или объём текстом, например '220 Г' или '400 МЛ'
 *      photo    — ссылка на фото. Необязательно — если не указать,
 *                 вместо фото будет цветной блок с первой буквой названия
 *      heat     — необязательно, число от 1 до 3, показывает огоньки остроты.
 *                 Просто не пишите эту строку, если товар не острый
 *      featured — необязательно, true — сделать карточку крупной
 *                 (на странице должна быть только одна такая)
 * 4. Сохраните изменения (на GitHub — кнопка "Commit changes").
 *    Через 30–60 секунд сайт обновится сам.
 *
 * КАК УДАЛИТЬ ТОВАР — удалите его блок { ... } целиком (и лишнюю запятую).
 * КАК ИЗМЕНИТЬ ЦЕНУ / ОПИСАНИЕ / ФОТО — отредактируйте нужное поле у товара.
 */

var MENU_ITEMS = [
  {
    id: 'dabl-smash',
    category: 'burgers',
    name: 'Дабл Смэш',
    tag: 'Две котлеты смэш по 90 г, двойной чеддер, угольный соус',
    price: 490,
    weight: '280 Г',
    photo: 'https://images.unsplash.com/photo-1534790566855-4cb788d389ec?w=900&h=620&fit=crop&q=80&auto=format',
    heat: 1,
    featured: true
  },
  {
    id: 'classic',
    category: 'burgers',
    name: 'Классик Чизбургер',
    tag: 'Котлета 180 г, чеддер, маринованный лук',
    price: 390,
    weight: '180 Г',
    photo: 'https://images.unsplash.com/photo-1603508102983-99b101395d1a?w=700&h=440&fit=crop&q=80&auto=format'
  },
  {
    id: 'bacon-bbq',
    category: 'burgers',
    name: 'Бекон BBQ',
    tag: 'Хрустящий бекон, копчёный BBQ-соус, лук кольцами',
    price: 450,
    weight: '220 Г',
    photo: 'https://images.unsplash.com/photo-1639020715113-996f7f8f2999?w=700&h=440&fit=crop&q=80&auto=format'
  },
  {
    id: 'jalapeno',
    category: 'burgers',
    name: 'Халапеньо Файр',
    tag: 'Свежий халапеньо, острый соус, пеппер джек',
    price: 430,
    weight: '200 Г',
    photo: 'https://images.unsplash.com/photo-1484216287461-d8f62bc4d22a?w=700&h=440&fit=crop&q=80&auto=format',
    heat: 3
  },
  {
    id: 'pickle',
    category: 'burgers',
    name: 'Пиклбургер',
    tag: 'Двойные солёные огурцы, горчичный майонез',
    price: 410,
    weight: '190 Г',
    photo: 'https://images.unsplash.com/photo-1562346816-9d0bdd559ec1?w=700&h=440&fit=crop&q=80&auto=format'
  },
  {
    id: 'fries',
    category: 'sides',
    name: 'Картофель фри на говяжьем жире',
    tag: 'Хрустящая корочка, крупная соль',
    price: 220,
    weight: '180 Г',
    photo: 'https://images.unsplash.com/photo-1623238912680-26fc5ffb57e4?w=700&h=440&fit=crop&q=80&auto=format'
  },
  {
    id: 'onion-rings',
    category: 'sides',
    name: 'Кольца лука в темпуре',
    tag: 'Хрустящая панировка, соус чипотле',
    price: 240,
    weight: '160 Г',
    photo: 'https://images.unsplash.com/photo-1639024469010-44d77e559f7d?w=700&h=440&fit=crop&q=80&auto=format'
  },
  {
    id: 'shake',
    category: 'drinks',
    name: 'Молочный шейк с карамелью',
    tag: 'Пломбир, солёная карамель, взбитые сливки',
    price: 280,
    weight: '400 МЛ',
    photo: 'https://images.unsplash.com/photo-1686638745403-d21193f16b2f?w=700&h=440&fit=crop&q=80&auto=format'
  }
];

(function(){
  function heatDotsHTML(level){
    var dots = '';
    for(var i = 1; i <= 3; i++){
      dots += '<i' + (i <= level ? ' class="on"' : '') + '></i>';
    }
    return '<div class="heat">' + dots + '</div>';
  }

  function cardHTML(item){
    var photoBlock;
    if(item.photo){
      photoBlock = '<div class="menu-photo"><img src="' + item.photo + '" alt="' + item.name + '" loading="lazy">' +
        (item.heat ? heatDotsHTML(item.heat) : '') +
        '</div>';
    } else {
      photoBlock = '<div class="menu-swatch">' + item.name.charAt(0) + '</div>';
    }
    return '<div class="menu-card' + (item.featured ? ' featured' : '') + '" data-cat="' + item.category + '">' +
      photoBlock +
      '<div class="menu-body">' +
        '<h3>' + item.name + '</h3>' +
        '<p class="tag">' + item.tag + '</p>' +
        '<div class="row"><span class="price">' + item.price + ' ₽</span><span class="weight">' + item.weight + '</span></div>' +
        '<div class="cart-add" data-id="' + item.id + '" data-name="' + item.name + '" data-price="' + item.price + '"></div>' +
      '</div>' +
    '</div>';
  }

  var grid = document.getElementById('menu-grid');
  if(grid){
    grid.innerHTML = MENU_ITEMS.map(cardHTML).join('');
  }
})();
