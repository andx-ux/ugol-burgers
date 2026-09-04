/*
 * Загружает список товаров из data/menu.json и строит карточки меню.
 *
 * Товары редактируются двумя способами:
 *  1. Визуально — через admin.html (форма, кнопка «Сохранить»).
 *  2. Вручную — правкой файла data/menu.json прямо на GitHub.
 *
 * Этот файл только отображает то, что лежит в data/menu.json —
 * его саму трогать не нужно.
 */
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
    return '<div class="menu-card' + (item.featured ? ' featured' : '') + '" data-cat="' + item.category + '" data-id="' + item.id + '">' +
      photoBlock +
      '<div class="menu-body">' +
        '<h3>' + item.name + '</h3>' +
        '<p class="tag">' + item.tag + '</p>' +
        '<div class="row"><span class="price">' + formatEUR(item.price) + '</span><span class="weight">' + item.weight + '</span></div>' +
        '<div class="cart-add" data-id="' + item.id + '" data-name="' + item.name + '" data-price="' + item.price + '"></div>' +
      '</div>' +
    '</div>';
  }

  var grid = document.getElementById('menu-grid');

  // Exposed as a promise (not an event) so script.js can safely react to it
  // even if menu.json finishes loading before script.js has attached a
  // listener — a plain event would fire into the void in that case.
  window.menuReady = fetch('data/menu.json')
    .then(function(res){
      if(!res.ok) throw new Error('menu.json: ' + res.status);
      return res.json();
    })
    .then(function(items){
      window.__MENU_ITEMS__ = items;
      if(grid){ grid.innerHTML = items.map(cardHTML).join(''); }
    })
    .catch(function(err){
      console.error('Не удалось загрузить меню:', err);
      if(grid){ grid.innerHTML = '<p style="color:var(--paper-dim);">Меню временно недоступно. Загляните чуть позже.</p>'; }
    });
})();
