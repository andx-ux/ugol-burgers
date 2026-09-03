(function(){
  var header = document.getElementById('site-header');
  var onScroll = function(){
    if(window.scrollY > 40){ header.classList.add('scrolled'); }
    else { header.classList.remove('scrolled'); }
  };
  window.addEventListener('scroll', onScroll, {passive:true});
  onScroll();

  var toggle = document.getElementById('nav-toggle');
  var mobileMenu = document.getElementById('mobile-menu');
  toggle.addEventListener('click', function(){
    var open = mobileMenu.style.display === 'block';
    mobileMenu.style.display = open ? 'none' : 'block';
    toggle.setAttribute('aria-expanded', String(!open));
    toggle.textContent = open ? '☰' : '✕';
  });
  mobileMenu.querySelectorAll('a').forEach(function(a){
    a.addEventListener('click', function(){
      mobileMenu.style.display = 'none';
      toggle.setAttribute('aria-expanded','false');
      toggle.textContent = '☰';
    });
  });

  var menuChips = document.querySelectorAll('#menu-filters .chip');
  var cards = document.querySelectorAll('.menu-card');
  menuChips.forEach(function(c){
    c.addEventListener('click', function(){
      menuChips.forEach(function(x){x.classList.remove('active');});
      c.classList.add('active');
      var cat = c.getAttribute('data-cat');
      cards.forEach(function(card){
        var show = cat === 'all' || card.getAttribute('data-cat') === cat;
        card.classList.toggle('is-hidden', !show);
      });
    });
  });

  var track = document.getElementById('testi-track');
  document.getElementById('testi-next').addEventListener('click', function(){
    track.scrollBy({left: 360, behavior:'smooth'});
  });
  document.getElementById('testi-prev').addEventListener('click', function(){
    track.scrollBy({left: -360, behavior:'smooth'});
  });

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var revealEls = document.querySelectorAll('.reveal');
  if('IntersectionObserver' in window && !reduceMotion){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if(en.isIntersecting){ en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, {threshold:0.15});
    revealEls.forEach(function(el){ io.observe(el); });
  } else {
    revealEls.forEach(function(el){ el.classList.add('in'); });
  }

  var counters = document.querySelectorAll('.stat-tile .num');
  var animateCount = function(el){
    var target = parseInt(el.getAttribute('data-count'), 10);
    var suffix = el.getAttribute('data-suffix') || '';
    if(reduceMotion){ el.textContent = target + suffix; return; }
    var start = null;
    var dur = 1100;
    var step = function(ts){
      if(!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if(p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  if('IntersectionObserver' in window){
    var io2 = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if(en.isIntersecting){ animateCount(en.target); io2.unobserve(en.target); }
      });
    }, {threshold:0.5});
    counters.forEach(function(el){ io2.observe(el); });
  } else {
    counters.forEach(animateCount);
  }
})();

/* ---------- CART / ORDER ---------- */
(function(){
  // TODO: замените на реальный username Telegram-аккаунта бургерной (без @)
  var TELEGRAM_USERNAME = 'ugol_orders';
  var STORAGE_KEY = 'ugol_cart_v1';

  var cartToggle = document.getElementById('cart-toggle');
  var cartOverlay = document.getElementById('cart-overlay');
  var cartDrawer = document.getElementById('cart-drawer');
  var cartClose = document.getElementById('cart-close');
  var cartCount = document.getElementById('cart-count');
  var cartItemsEl = document.getElementById('cart-items');
  var cartEmptyEl = document.getElementById('cart-empty');
  var cartTotalEl = document.getElementById('cart-total');
  var checkoutTotalEl = document.getElementById('checkout-total');
  var checkoutBtn = document.getElementById('cart-checkout-btn');
  var backBtn = document.getElementById('cart-back-btn');
  var panelItems = document.getElementById('cart-panel-items');
  var panelCheckout = document.getElementById('cart-panel-checkout');
  var panelDone = document.getElementById('cart-panel-done');
  var addressField = document.getElementById('cf-address-field');
  var addressInput = document.getElementById('cf-address');
  var nameInput = document.getElementById('cf-name');
  var phoneInput = document.getElementById('cf-phone');
  var commentInput = document.getElementById('cf-comment');
  var methodChips = document.querySelectorAll('#method-filters .chip');
  var copyBtn = document.getElementById('cart-copy-btn');
  var newOrderBtn = document.getElementById('cart-new-btn');

  if(!cartToggle || !cartDrawer) return;

  var currentMethod = 'pickup';
  var lastOrderText = '';

  function loadCart(){
    try{
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch(e){ return {}; }
  }
  function saveCart(cart){
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(cart)); } catch(e){}
  }
  function getItemMeta(id){
    var el = document.querySelector('.cart-add[data-id="' + id + '"]');
    if(!el) return null;
    return {
      name: el.getAttribute('data-name'),
      price: parseInt(el.getAttribute('data-price'), 10)
    };
  }

  var cart = loadCart();

  function cartCountTotal(){
    return Object.keys(cart).reduce(function(sum, id){ return sum + cart[id]; }, 0);
  }
  function cartPriceTotal(){
    return Object.keys(cart).reduce(function(sum, id){
      var meta = getItemMeta(id);
      return sum + (meta ? meta.price * cart[id] : 0);
    }, 0);
  }

  function renderAddControls(){
    document.querySelectorAll('.cart-add').forEach(function(el){
      var id = el.getAttribute('data-id');
      var qty = cart[id] || 0;
      if(qty > 0){
        el.innerHTML = '<div class="stepper">' +
          '<button type="button" class="cart-dec" data-id="' + id + '">−</button>' +
          '<span>' + qty + '</span>' +
          '<button type="button" class="cart-inc" data-id="' + id + '">+</button>' +
          '</div>';
      } else {
        el.innerHTML = '<button type="button" class="cart-add-btn" data-id="' + id + '">В корзину</button>';
      }
    });
  }

  function renderDrawer(){
    var count = cartCountTotal();
    if(count > 0){
      cartCount.textContent = String(count);
      cartCount.hidden = false;
    } else {
      cartCount.hidden = true;
    }

    var ids = Object.keys(cart);
    if(ids.length === 0){
      cartEmptyEl.hidden = false;
      cartItemsEl.innerHTML = '';
      checkoutBtn.disabled = true;
    } else {
      cartEmptyEl.hidden = true;
      checkoutBtn.disabled = false;
      cartItemsEl.innerHTML = ids.map(function(id){
        var meta = getItemMeta(id);
        if(!meta) return '';
        var qty = cart[id];
        return '<div class="cart-item">' +
          '<h4>' + meta.name + '</h4>' +
          '<span class="cart-item-price">' + (meta.price * qty) + ' ₽</span>' +
          '<div class="stepper"><button type="button" class="cart-dec" data-id="' + id + '">−</button><span>' + qty + '</span><button type="button" class="cart-inc" data-id="' + id + '">+</button></div>' +
          '<button type="button" class="cart-item-remove" data-id="' + id + '">убрать</button>' +
          '</div>';
      }).join('');
    }

    var total = cartPriceTotal();
    cartTotalEl.textContent = total + ' ₽';
    checkoutTotalEl.textContent = total + ' ₽';
  }

  function renderAll(){
    renderAddControls();
    renderDrawer();
  }

  function changeQty(id, delta){
    var qty = (cart[id] || 0) + delta;
    if(qty <= 0){ delete cart[id]; } else { cart[id] = qty; }
    saveCart(cart);
    renderAll();
  }

  document.addEventListener('click', function(e){
    var addBtn = e.target.closest('.cart-add-btn');
    if(addBtn){ changeQty(addBtn.getAttribute('data-id'), 1); return; }
    var inc = e.target.closest('.cart-inc');
    if(inc){ changeQty(inc.getAttribute('data-id'), 1); return; }
    var dec = e.target.closest('.cart-dec');
    if(dec){ changeQty(dec.getAttribute('data-id'), -1); return; }
    var rem = e.target.closest('.cart-item-remove');
    if(rem){ delete cart[rem.getAttribute('data-id')]; saveCart(cart); renderAll(); return; }
  });

  function openDrawer(){
    cartOverlay.hidden = false;
    requestAnimationFrame(function(){
      cartOverlay.classList.add('open');
      cartDrawer.classList.add('open');
    });
    cartDrawer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
  function closeDrawer(){
    cartOverlay.classList.remove('open');
    cartDrawer.classList.remove('open');
    cartDrawer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    setTimeout(function(){ cartOverlay.hidden = true; }, 300);
  }
  cartToggle.addEventListener('click', function(){ renderDrawer(); openDrawer(); });
  cartClose.addEventListener('click', closeDrawer);
  cartOverlay.addEventListener('click', closeDrawer);

  function showPanel(panel){
    [panelItems, panelCheckout, panelDone].forEach(function(p){ p.hidden = (p !== panel); });
  }

  checkoutBtn.addEventListener('click', function(){
    renderDrawer();
    showPanel(panelCheckout);
  });
  backBtn.addEventListener('click', function(){ showPanel(panelItems); });

  methodChips.forEach(function(chip){
    chip.addEventListener('click', function(){
      methodChips.forEach(function(c){ c.classList.remove('active'); });
      chip.classList.add('active');
      currentMethod = chip.getAttribute('data-method');
      var isDelivery = currentMethod === 'delivery';
      addressField.hidden = !isDelivery;
      addressInput.required = isDelivery;
    });
  });

  function buildOrderText(){
    var lines = ['Новый заказ — УГОЛЬ', ''];
    var total = 0;
    Object.keys(cart).forEach(function(id){
      var meta = getItemMeta(id);
      if(!meta) return;
      var qty = cart[id];
      var sum = meta.price * qty;
      total += sum;
      lines.push(meta.name + ' × ' + qty + ' — ' + sum + ' ₽');
    });
    lines.push('', 'Итого: ' + total + ' ₽', '');
    lines.push('Имя: ' + nameInput.value.trim());
    lines.push('Телефон: ' + phoneInput.value.trim());
    lines.push('Получение: ' + (currentMethod === 'delivery' ? 'Доставка' : 'Самовывоз'));
    if(currentMethod === 'delivery'){
      lines.push('Адрес: ' + addressInput.value.trim());
    }
    if(commentInput.value.trim()){
      lines.push('Комментарий: ' + commentInput.value.trim());
    }
    return lines.join('\n');
  }

  panelCheckout.addEventListener('submit', function(e){
    e.preventDefault();
    if(!panelCheckout.reportValidity()) return;

    lastOrderText = buildOrderText();
    var url = 'https://t.me/' + TELEGRAM_USERNAME + '?text=' + encodeURIComponent(lastOrderText);
    window.open(url, '_blank', 'noopener');

    cart = {};
    saveCart(cart);
    renderAll();
    showPanel(panelDone);
  });

  copyBtn.addEventListener('click', function(){
    if(!lastOrderText) return;
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(lastOrderText).then(function(){
        copyBtn.textContent = 'Скопировано';
        setTimeout(function(){ copyBtn.textContent = 'Скопировать текст заказа'; }, 1800);
      }).catch(function(){});
    }
  });

  newOrderBtn.addEventListener('click', function(){
    panelCheckout.reset();
    methodChips.forEach(function(c){ c.classList.remove('active'); });
    methodChips[0].classList.add('active');
    currentMethod = 'pickup';
    addressField.hidden = true;
    addressInput.required = false;
    showPanel(panelItems);
  });

  renderAll();
})();
