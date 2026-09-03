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

  var chips = document.querySelectorAll('.chip');
  var cards = document.querySelectorAll('.menu-card');
  chips.forEach(function(c){
    c.addEventListener('click', function(){
      chips.forEach(function(x){x.classList.remove('active');});
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
