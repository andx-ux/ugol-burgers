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

/* ---------- Toast ---------- */
var toastTimer = null;
function showToast(message){
  var toast = document.getElementById('toast');
  if(!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function(){ toast.classList.remove('show'); }, 2000);
}

/* ---------- Shared cart state (used by both the cart drawer and the
   item detail panel — cart items are {qty, comment} per product id) ---------- */
var CART_STORAGE_KEY = 'ugol_cart_v1';
var cart = {};

function loadCartFromStorage(){
  try{
    var raw = localStorage.getItem(CART_STORAGE_KEY);
    var parsed = raw ? JSON.parse(raw) : {};
    // migrate from the old {id: qty} format if it's still in localStorage
    Object.keys(parsed).forEach(function(id){
      if(typeof parsed[id] === 'number'){ parsed[id] = {qty: parsed[id], comment: ''}; }
    });
    return parsed;
  } catch(e){ return {}; }
}
function persistCart(){
  try{ localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart)); } catch(e){}
}
function getItemMeta(id){
  var el = document.querySelector('.cart-add[data-id="' + id + '"]');
  if(!el) return null;
  return {
    name: el.getAttribute('data-name'),
    price: parseFloat(el.getAttribute('data-price'))
  };
}
function getCartEntry(id){
  return cart[id] || {qty: 0, comment: ''};
}
function setCartEntry(id, qty, comment){
  if(qty <= 0){ delete cart[id]; }
  else { cart[id] = {qty: qty, comment: comment || ''}; }
  persistCart();
}
function changeCartQty(id, delta){
  var entry = getCartEntry(id);
  setCartEntry(id, entry.qty + delta, entry.comment);
}
function cartCountTotal(){
  return Object.keys(cart).reduce(function(sum, id){ return sum + cart[id].qty; }, 0);
}
function cartPriceTotalCents(){
  return Object.keys(cart).reduce(function(sum, id){
    var meta = getItemMeta(id);
    return sum + (meta ? toCents(meta.price) * cart[id].qty : 0);
  }, 0);
}
function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });
}

/* ---------- Everything below needs the menu cards to exist first, so it
   waits on window.menuReady (set by menu-data.js). It's a promise rather
   than an event because the fetch can resolve before this line even runs —
   an event would fire into the void in that case; a promise never does. ---------- */
window.menuReady.then(function(){
  cart = loadCartFromStorage();
  initMenuFilters();
  initCart();
  initItemDetail();
  renderCartAll();
});

function initMenuFilters(){
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
}

/* ---------- Rendering shared between the cart drawer and quick-add controls ---------- */
function renderAddControls(){
  document.querySelectorAll('.cart-add').forEach(function(el){
    var id = el.getAttribute('data-id');
    var qty = getCartEntry(id).qty;
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

function renderCartDrawer(){
  var cartCount = document.getElementById('cart-count');
  var cartEmptyEl = document.getElementById('cart-empty');
  var cartItemsEl = document.getElementById('cart-items');
  var checkoutBtn = document.getElementById('cart-checkout-btn');
  var clearBtn = document.getElementById('cart-clear-btn');
  var cartTotalEl = document.getElementById('cart-total');
  var checkoutTotalEl = document.getElementById('checkout-total');

  var count = cartCountTotal();
  cartCount.hidden = count === 0;
  if(count > 0){ cartCount.textContent = String(count); }

  var ids = Object.keys(cart);
  clearBtn.hidden = ids.length === 0;
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
      var entry = cart[id];
      return '<div class="cart-item">' +
        '<div class="cart-item-top">' +
          '<h4>' + meta.name + '</h4>' +
          '<button type="button" class="cart-item-x" data-id="' + id + '" aria-label="Убрать ' + meta.name + '">×</button>' +
        '</div>' +
        (entry.comment ? '<div class="cart-item-comment">«' + escapeHtml(entry.comment) + '»</div>' : '') +
        '<div class="cart-item-bottom">' +
          '<span class="cart-item-unit">' + formatEUR(meta.price) + ' × ' + entry.qty + '</span>' +
          '<div class="stepper"><button type="button" class="cart-dec" data-id="' + id + '">−</button><span>' + entry.qty + '</span><button type="button" class="cart-inc" data-id="' + id + '">+</button></div>' +
          '<span class="cart-item-sum">' + formatCents(toCents(meta.price) * entry.qty) + '</span>' +
        '</div>' +
        '</div>';
    }).join('');
  }

  var totalCents = cartPriceTotalCents();
  cartTotalEl.textContent = formatCents(totalCents);
  checkoutTotalEl.textContent = formatCents(totalCents);
}

function renderCartAll(){
  renderAddControls();
  renderCartDrawer();
}

/* ---------- CART DRAWER + CHECKOUT ---------- */
function initCart(){
  var cartToggle = document.getElementById('cart-toggle');
  var cartOverlay = document.getElementById('cart-overlay');
  var cartDrawer = document.getElementById('cart-drawer');
  var cartClose = document.getElementById('cart-close');
  var cartItemsEl = document.getElementById('cart-items');
  var checkoutBtn = document.getElementById('cart-checkout-btn');
  var backBtn = document.getElementById('cart-back-btn');
  var panelItems = document.getElementById('cart-panel-items');
  var panelCheckout = document.getElementById('cart-panel-checkout');
  var payBtn = document.getElementById('cart-pay-btn');
  var checkoutError = document.getElementById('checkout-error');
  var addressField = document.getElementById('cf-address-field');
  var addressInput = document.getElementById('cf-address');
  var nameInput = document.getElementById('cf-name');
  var phoneInput = document.getElementById('cf-phone');
  var commentInput = document.getElementById('cf-comment');
  var methodChips = document.querySelectorAll('#method-filters .chip');
  var timeChips = document.querySelectorAll('#time-filters .chip');
  var timeField = document.getElementById('cf-time-field');
  var timeInput = document.getElementById('cf-time');
  var paymentChips = document.querySelectorAll('#payment-filters .chip');
  var checkoutNote = document.getElementById('checkout-note');
  var clearBtn = document.getElementById('cart-clear-btn');

  if(!cartToggle || !cartDrawer) return;

  var currentMethod = 'pickup';
  var currentTimeMode = 'now';
  var currentPayment = 'card';

  var PAYMENT_ENDPOINTS = {
    card: '/api/create-checkout-session',
    cash: '/api/submit-order'
  };
  var PAYMENT_NOTES = {
    card: 'Безопасная оплата картой через Stripe — Visa, Mastercard, Apple Pay, Google Pay.',
    cash: 'Оплата наличными или картой курьеру — при доставке, либо на кассе при самовывозе.'
  };
  var PAYMENT_BUTTON_LABELS = {
    card: 'Оплатить картой',
    cash: 'Оформить заказ'
  };

  document.addEventListener('click', function(e){
    var addBtn = e.target.closest('.cart-add-btn');
    if(addBtn){
      changeCartQty(addBtn.getAttribute('data-id'), 1);
      renderCartAll();
      showToast('Добавлено в корзину');
      return;
    }
    var inc = e.target.closest('.cart-inc');
    if(inc){ changeCartQty(inc.getAttribute('data-id'), 1); renderCartAll(); return; }
    var dec = e.target.closest('.cart-dec');
    if(dec){ changeCartQty(dec.getAttribute('data-id'), -1); renderCartAll(); return; }
    var rem = e.target.closest('.cart-item-x');
    if(rem){ delete cart[rem.getAttribute('data-id')]; persistCart(); renderCartAll(); return; }
  });

  clearBtn.addEventListener('click', function(){
    cart = {};
    persistCart();
    renderCartAll();
  });

  function openDrawer(){
    cartOverlay.hidden = false;
    void cartDrawer.offsetHeight; // force layout so the slide-in transition still plays
    cartOverlay.classList.add('open');
    cartDrawer.classList.add('open');
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
  cartToggle.addEventListener('click', function(){ renderCartDrawer(); openDrawer(); });
  cartClose.addEventListener('click', closeDrawer);
  cartOverlay.addEventListener('click', closeDrawer);

  function showPanel(panel){
    [panelItems, panelCheckout].forEach(function(p){ p.hidden = (p !== panel); });
  }

  checkoutBtn.addEventListener('click', function(){
    renderCartDrawer();
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

  timeChips.forEach(function(chip){
    chip.addEventListener('click', function(){
      timeChips.forEach(function(c){ c.classList.remove('active'); });
      chip.classList.add('active');
      currentTimeMode = chip.getAttribute('data-time');
      var isLater = currentTimeMode === 'later';
      timeField.hidden = !isLater;
      timeInput.required = isLater;
    });
  });

  paymentChips.forEach(function(chip){
    chip.addEventListener('click', function(){
      paymentChips.forEach(function(c){ c.classList.remove('active'); });
      chip.classList.add('active');
      currentPayment = chip.getAttribute('data-payment');
      checkoutNote.textContent = PAYMENT_NOTES[currentPayment];
      payBtn.textContent = PAYMENT_BUTTON_LABELS[currentPayment];
    });
  });

  var progressLabels = {card: 'Переходим к оплате…', cash: 'Отправляем заказ…'};

  function setPaying(paying){
    payBtn.disabled = paying;
    payBtn.textContent = paying ? progressLabels[currentPayment] : PAYMENT_BUTTON_LABELS[currentPayment];
  }

  panelCheckout.addEventListener('submit', function(e){
    e.preventDefault();
    checkoutError.hidden = true;
    if(!panelCheckout.reportValidity()) return;

    var payload = {
      items: Object.keys(cart).map(function(id){
        return {id: id, qty: cart[id].qty, comment: cart[id].comment || ''};
      }),
      contact: {
        name: nameInput.value.trim(),
        phone: phoneInput.value.trim(),
        method: currentMethod,
        address: currentMethod === 'delivery' ? addressInput.value.trim() : '',
        timeMode: currentTimeMode,
        time: currentTimeMode === 'later' ? timeInput.value : '',
        comment: commentInput.value.trim()
      }
    };

    setPaying(true);
    fetch(PAYMENT_ENDPOINTS[currentPayment], {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    })
      .then(function(res){
        if(!res.ok){
          return res.json().catch(function(){ return {}; }).then(function(body){
            throw new Error(body.error || 'Не получилось оформить заказ.');
          });
        }
        return res.json();
      })
      .then(function(data){
        // cart is intentionally left intact here — it's only cleared once
        // the browser actually lands on success.html.
        window.location.href = data.url;
      })
      .catch(function(err){
        setPaying(false);
        checkoutError.textContent = err.message || 'Не получилось перейти к оплате. Попробуйте ещё раз.';
        checkoutError.hidden = false;
      });
  });
}

/* ---------- ITEM DETAIL PANEL ---------- */
function initItemDetail(){
  var overlay = document.getElementById('item-overlay');
  var drawer = document.getElementById('item-drawer');
  var closeBtn = document.getElementById('item-close');
  var titleEl = document.getElementById('item-title');
  var photoWrap = document.getElementById('item-photo-wrap');
  var photoImg = document.getElementById('item-photo');
  var tagEl = document.getElementById('item-tag');
  var commentEl = document.getElementById('item-comment');
  var qtyEl = document.getElementById('item-qty');
  var sumEl = document.getElementById('item-sum');
  var decBtn = document.getElementById('item-dec');
  var incBtn = document.getElementById('item-inc');
  var addBtn = document.getElementById('item-add-btn');
  var grid = document.getElementById('menu-grid');

  if(!overlay || !drawer || !grid) return;

  var currentItem = null;
  var currentQty = 1;

  function updateQtyUI(){
    qtyEl.textContent = currentQty;
    sumEl.textContent = formatCents(toCents(currentItem.price) * currentQty);
  }

  function openFor(id){
    var items = window.__MENU_ITEMS__ || [];
    var item = items.filter(function(i){ return i.id === id; })[0];
    if(!item) return;
    currentItem = item;

    var entry = getCartEntry(id);
    currentQty = entry.qty > 0 ? entry.qty : 1;

    titleEl.textContent = item.name;
    tagEl.textContent = item.tag || '';
    if(item.photo){
      photoImg.src = item.photo;
      photoImg.alt = item.name;
      photoWrap.hidden = false;
    } else {
      photoWrap.hidden = true;
    }
    commentEl.value = entry.comment || '';
    addBtn.textContent = entry.qty > 0 ? 'Обновить корзину' : 'Добавить в корзину';
    updateQtyUI();

    overlay.hidden = false;
    void drawer.offsetHeight; // force layout so the slide-in transition still plays
    overlay.classList.add('open');
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function close(){
    overlay.classList.remove('open');
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    setTimeout(function(){ overlay.hidden = true; }, 300);
  }

  decBtn.addEventListener('click', function(){
    if(currentQty > 1){ currentQty--; updateQtyUI(); }
  });
  incBtn.addEventListener('click', function(){ currentQty++; updateQtyUI(); });
  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', close);

  addBtn.addEventListener('click', function(){
    if(!currentItem) return;
    setCartEntry(currentItem.id, currentQty, commentEl.value.trim());
    renderCartAll();
    showToast('Добавлено в корзину');
    close();
  });

  grid.addEventListener('click', function(e){
    if(e.target.closest('.cart-add')) return;
    var card = e.target.closest('.menu-card');
    if(card){ openFor(card.getAttribute('data-id')); }
  });
}
