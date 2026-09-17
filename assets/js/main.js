/* =============================================================================
   Everything Food — interaction layer
   Motion rules: transform/opacity only, transitions over keyframes for anything
   that can be re-triggered mid-flight, and reduced motion gets fewer and gentler
   animations rather than none.
   ========================================================================== */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------------------------------------------------------------- Reveals */
  // Items inside a horizontal rail sit outside the viewport sideways, so they
  // reveal as a group when the rail scrolls into view rather than one by one.
  var railGroup = $('#rail');
  var revealed = $$('.reveal').filter(function (el) { return !railGroup || !railGroup.contains(el); });

  if ('IntersectionObserver' in window) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        revealObserver.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.1 });
    revealed.forEach(function (el) { revealObserver.observe(el); });

    if (railGroup) {
      var railObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          $$('.reveal', railGroup).forEach(function (el, i) {
            // Cap the stagger so the tail of a long rail is not left waiting.
            el.style.setProperty('--reveal-delay', Math.min(i, 5) * 70 + 'ms');
            el.classList.add('is-in');
          });
          railObserver.disconnect();
        });
      }, { threshold: 0.15 });
      railObserver.observe(railGroup);
    }
  } else {
    $$('.reveal').forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ------------------------------------------------- Header state + progress */
  var header = $('#header');
  var progress = $('#progress');
  var toTop = $('#to-top');
  var parallax = $('.hero__media');
  var ticking = false;

  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    var max = document.documentElement.scrollHeight - window.innerHeight;

    header.classList.toggle('is-stuck', y > 8);
    toTop.classList.toggle('is-on', y > 700);
    progress.style.transform = 'scaleX(' + (max > 0 ? Math.min(y / max, 1) : 0) + ')';

    // Hero footage drifts slower than the page. Transform only, and only while
    // the hero is still on screen.
    if (parallax && !reduceMotion.matches && y < window.innerHeight) {
      parallax.style.transform = 'scale(1.12) translate3d(0, ' + (y * 0.14) + 'px, 0)';
    }
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(onScroll);
  }, { passive: true });
  onScroll();

  toTop.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
  });

  /* ----------------------------------------------------- Active nav section */
  var navLinks = $$('[data-nav]');
  var sectionFor = { top: '#top', bestsellers: '#bestsellers', services: '#services' };
  if ('IntersectionObserver' in window) {
    var watched = Object.keys(sectionFor)
      .map(function (k) { return $(sectionFor[k]); })
      .filter(Boolean);

    var navObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var id = '#' + entry.target.id;
        navLinks.forEach(function (a) {
          var href = a.getAttribute('href');
          // Links to another page carry their state from the server. Only
          // same-page anchors are the scroll position's to decide.
          if (href.charAt(0) !== '#') return;
          a.setAttribute('aria-current', href === id ? 'true' : 'false');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    watched.forEach(function (s) { navObserver.observe(s); });
  }

  /* ------------------------------------------------------------ Hero video */
  var video = $('#hero-video');
  var playBtn = $('#play-toggle');
  var playLabel = $('#play-label');
  var playIcon = $('.play__icon');
  var videoRequested = false;

  var PAUSE_PATH = 'M7 5h3.2v14H7zM13.8 5H17v14h-3.2z';
  var PLAY_PATH = 'M8 5.5v13l11-6.5z';

  function connectionAllowsVideo() {
    var c = navigator.connection;
    if (!c) return true;
    if (c.saveData) return false;
    return !/^(slow-2g|2g)$/.test(c.effectiveType || '');
  }

  function loadVideo() {
    if (videoRequested) return;
    videoRequested = true;

    // Mobile gets the lighter file; the layout crops either one the same way.
    // MP4 is listed first because it is the smaller encode — WebM is only
    // reached by browsers without an H.264 decoder.
    var size = window.matchMedia('(max-width: 780px)').matches ? '720' : '1280';
    [['/assets/video/kitchen-' + size + '.mp4', 'video/mp4'],
     ['/assets/video/kitchen-' + size + '.webm', 'video/webm']].forEach(function (pair) {
      var source = document.createElement('source');
      source.src = pair[0];
      source.type = pair[1];
      video.appendChild(source);
    });

    video.hidden = false;
    video.load();

    video.addEventListener('canplay', function () {
      video.classList.add('is-ready');
      var p = video.play();
      if (p && p.catch) p.catch(function () { setPlayState(false); });
      setPlayState(true);
    }, { once: true });
  }

  function setPlayState(playing) {
    playBtn.setAttribute('aria-pressed', String(playing));
    playLabel.textContent = playing ? 'Pause the kitchen' : 'Watch the kitchen';
    playIcon.firstElementChild
      ? playIcon.firstElementChild.setAttribute('d', playing ? PAUSE_PATH : PLAY_PATH)
      : null;
  }

  if (video && playBtn) {
    // Autoplay only when motion is welcome and the connection can afford it.
    if (!reduceMotion.matches && connectionAllowsVideo()) {
      if ('IntersectionObserver' in window) {
        var heroObserver = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              loadVideo();
              heroObserver.disconnect();
            }
          });
        }, { threshold: 0.15 });
        heroObserver.observe($('.hero'));
      } else {
        loadVideo();
      }
    }

    playBtn.addEventListener('click', function () {
      if (!videoRequested) { loadVideo(); return; }
      if (video.paused) {
        var p = video.play();
        if (p && p.catch) p.catch(function () {});
        setPlayState(true);
      } else {
        video.pause();
        setPlayState(false);
      }
    });

    // Don't burn a decoder on a tab nobody is looking at.
    document.addEventListener('visibilitychange', function () {
      if (!videoRequested) return;
      if (document.hidden) {
        video.pause();
      } else if (playBtn.getAttribute('aria-pressed') === 'true') {
        var p = video.play();
        if (p && p.catch) p.catch(function () {});
      }
    });
  }

  /* ---------------------------------------------------------- Mobile drawer */
  var burger = $('#burger');
  var drawer = $('#drawer');
  var scrim = $('#scrim');

  function setDrawer(open) {
    burger.setAttribute('aria-expanded', String(open));
    drawer.classList.toggle('is-open', open);
    drawer.setAttribute('aria-hidden', String(!open));
    scrim.hidden = false;
    scrim.classList.toggle('is-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) {
      var first = drawer.querySelector('a');
      if (first) first.focus();
    }
  }

  burger.addEventListener('click', function () {
    setDrawer(burger.getAttribute('aria-expanded') !== 'true');
  });
  scrim.addEventListener('click', function () { setDrawer(false); });
  $$('#drawer a').forEach(function (a) {
    a.addEventListener('click', function () { setDrawer(false); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') {
      setDrawer(false);
      burger.focus();
    }
  });

  /* ------------------------------------------------------------------- Cart */
  var cartBtn = $('#cart');
  var cartCount = $('#cart-count');
  var toast = $('#toast');
  var toastText = $('#toast-text');
  var count = 0;
  var toastTimer;

  function showToast(message) {
    toastText.textContent = message;
    toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('is-on'); }, 2400);
  }

  function addToCart(name) {
    count += 1;
    cartCount.textContent = String(count);
    cartCount.classList.add('is-on');
    cartBtn.setAttribute('aria-label', 'Cart, ' + count + (count === 1 ? ' item' : ' items'));

    // Bump as a transition so rapid clicks retarget instead of restarting.
    cartCount.classList.add('is-bumped');
    setTimeout(function () { cartCount.classList.remove('is-bumped'); }, 160);

    showToast(name + ' added to your order');
  }

  $$('.card__add').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var card = btn.closest('.card');
      addToCart(card.dataset.name.replace(/&amp;/g, '&'));

      btn.classList.add('is-added');
      setTimeout(function () { btn.classList.remove('is-added'); }, 700);
    });
  });

  // The menu page drives the same cart and toast from its own script.
  window.EF = {
    addToCart: addToCart,
    showToast: showToast,
    cartButton: cartBtn,
    reduceMotion: reduceMotion,
  };

  $$('.card__fav').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var on = btn.getAttribute('aria-pressed') !== 'true';
      btn.setAttribute('aria-pressed', String(on));
      var svg = btn.querySelector('svg');
      if (svg) svg.setAttribute('fill', on ? 'currentColor' : 'none');
    });
  });

  /* ------------------------------------------------------- Filters + search */
  var cards = $$('#product-grid .card');
  var filterBtns = $$('.filter');
  var status = $('#filter-status');
  var searchInput = $('#q');
  var activeFilter = 'all';
  var query = '';

  function applyFilters() {
    var shown = 0;
    cards.forEach(function (card) {
      var matchesCat = activeFilter === 'all' || card.dataset.cat === activeFilter;
      var text = (card.dataset.name + ' ' + card.textContent).toLowerCase();
      var matchesQuery = !query || text.indexOf(query) > -1;
      var visible = matchesCat && matchesQuery;

      card.classList.toggle('is-filtered', !visible);
      if (visible) {
        shown += 1;
        // Re-enter with the same reveal transition rather than snapping in.
        card.classList.remove('is-in');
        void card.offsetWidth;
        card.style.setProperty('--reveal-delay', (shown - 1) * 45 + 'ms');
        card.classList.add('is-in');
      }
    });

    if (!status) return;

    if (shown === cards.length) {
      status.textContent = '';
    } else if (shown === 0) {
      status.textContent = 'Nothing on the menu matches that yet. Try "jollof", "suya" or clear the filter.';
    } else {
      status.textContent = 'Showing ' + shown + ' of ' + cards.length + ' dishes.';
    }
  }

  filterBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      activeFilter = btn.dataset.filter;
      filterBtns.forEach(function (b) {
        b.setAttribute('aria-pressed', String(b === btn));
      });
      applyFilters();
    });
  });

  var searchTimer;
  if (searchInput && cards.length) {
    searchInput.addEventListener('input', function () {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () {
        query = searchInput.value.trim().toLowerCase();
        applyFilters();
      }, 180);
    });
  }

  /* -------------------------------------------------------------- Stat count */
  var stats = $$('[data-count]');
  function countUp(el) {
    var target = parseFloat(el.dataset.count);
    var suffix = el.dataset.suffix || '';

    if (reduceMotion.matches) {
      el.textContent = target + suffix;
      return;
    }

    var duration = 1100;
    var start = performance.now();
    function frame(now) {
      var t = Math.min((now - start) / duration, 1);
      var eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      el.textContent = Math.round(target * eased) + suffix;
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  if ('IntersectionObserver' in window) {
    var statObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        countUp(entry.target);
        statObserver.unobserve(entry.target);
      });
    }, { threshold: 0.6 });
    stats.forEach(function (el) { statObserver.observe(el); });
  } else {
    stats.forEach(function (el) { el.textContent = el.dataset.count + (el.dataset.suffix || ''); });
  }

  /* --------------------------------------------------------------- Rail nav */
  var rail = $('#rail');
  var prev = $('#rail-prev');
  var next = $('#rail-next');

  function railStep() {
    var card = rail.querySelector('.dish');
    if (!card) return rail.clientWidth * 0.8;
    var gap = parseFloat(getComputedStyle(rail).columnGap || '18') || 18;
    return (card.getBoundingClientRect().width + gap) * 2;
  }

  function syncRailNav() {
    var maxScroll = rail.scrollWidth - rail.clientWidth - 2;
    prev.disabled = rail.scrollLeft <= 2;
    next.disabled = rail.scrollLeft >= maxScroll;
  }

  if (rail && prev && next) {
    prev.addEventListener('click', function () { rail.scrollBy({ left: -railStep(), behavior: reduceMotion.matches ? 'auto' : 'smooth' }); });
    next.addEventListener('click', function () { rail.scrollBy({ left: railStep(), behavior: reduceMotion.matches ? 'auto' : 'smooth' }); });
    rail.addEventListener('scroll', function () {
      if (rail._t) return;
      rail._t = requestAnimationFrame(function () { rail._t = null; syncRailNav(); });
    }, { passive: true });
    window.addEventListener('resize', syncRailNav);
    syncRailNav();
  }

  /* -------------------------------------------------------------- Newsletter */
  var form = $('#signup-form');
  var note = $('#form-note');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = $('#email');
      var valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim());

      note.classList.remove('is-on');
      // Let the note leave before the new one arrives, so it reads as a change.
      setTimeout(function () {
        note.textContent = valid
          ? 'Done. Check your inbox on Friday morning.'
          : 'That email address does not look right yet.';
        note.style.color = valid ? '#8BE6B0' : '#F7B7AC';
        note.classList.add('is-on');
      }, 120);

      if (valid) { form.reset(); showToast('You are on the Friday list'); }
      else { email.focus(); }
    });
  }

  /* ----------------------------------------------------------- WebGL embers */
  // A spark field over the hero. Decorative, so it loads last, only on hardware
  // and connections that can carry it, and never against a reduced-motion
  // preference. A failed import leaves the page exactly as it was.
  var emberCanvas = $('#embers');

  function embersAreAffordable() {
    if (!emberCanvas || reduceMotion.matches) return false;
    if (!window.matchMedia('(min-width: 720px)').matches) return false;
    if (navigator.deviceMemory && navigator.deviceMemory < 4) return false;
    if (!connectionAllowsVideo()) return false;
    try {
      var probe = document.createElement('canvas');
      return !!(probe.getContext('webgl2') || probe.getContext('webgl'));
    } catch (e) {
      return false;
    }
  }

  if (embersAreAffordable()) {
    var loadEmbers = function () {
      import('/assets/js/embers.js?v=3')
        .then(function (mod) { mod.createEmbers(emberCanvas); })
        .catch(function () { emberCanvas.remove(); });
    };
    if ('requestIdleCallback' in window) {
      requestIdleCallback(loadEmbers, { timeout: 2500 });
    } else {
      setTimeout(loadEmbers, 1200);
    }
  } else if (emberCanvas) {
    emberCanvas.remove();
  }

  /* ------------------------------------------------------------------ Misc */
  var year = $('#year');
  if (year) year.textContent = String(new Date().getFullYear());

  // Smooth in-page jumps that still land on a focusable target for keyboards.
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      if (id === '#' || id.length < 2) return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
      history.replaceState(null, '', id);
    });
  });
})();
