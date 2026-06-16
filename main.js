/* ─────────────────────────────────────────────────────────
   main.js – Thiệp Cưới Nhật Anh & Thanh Huyền
   GPU-optimized, consolidated animation logic
   ───────────────────────────────────────────────────────── */
(function () {
  'use strict';

  function init() {
    console.log('[main.js] ✅ init() running — DOM readyState:', document.readyState);
    initSplash();
    initScrollReveal();
    initMusicToggle();
    initParallax();
    initLightbox();
    initPetals();
    console.log('[main.js] ✅ All modules initialized');
  }

  // Safety: run init immediately if DOM is ready, otherwise wait
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ── 1. Splash Screen ─────────────────────────────────── */
  function initSplash() {
    var btn = document.getElementById('open-invite');
    var splash = document.getElementById('splash-screen');
    if (!btn || !splash) return;

    var opened = false;

    function openInvite() {
      if (opened) return;
      opened = true;

      // Hide tap hint
      var tapHint = document.getElementById('tap-hint');
      if (tapHint) tapHint.style.display = 'none';

      // Disable button & fade it out via CSS class
      btn.style.pointerEvents = 'none';
      btn.classList.add('splash-btn-exit');

      // Start background music + visualizer
      var audio = document.getElementById('bg-music');
      var musicBtn = document.getElementById('music-toggle-btn');
      var vizCanvas = document.getElementById('music-visualizer');
      if (audio) {
        audio.play()
          .then(function () {
            if (musicBtn) musicBtn.classList.remove('music-paused');
            if (vizCanvas) startVisualizer(vizCanvas);
          })
          .catch(function () { /* autoplay blocked */ });
      }

      // Bloom content outward (GPU-accelerated CSS classes)
      requestAnimationFrame(function () {
        var items = splash.querySelectorAll('.splash-animate');
        for (var i = 0; i < items.length; i++) {
          items[i].style.transitionDelay = (i * 60) + 'ms';
          items[i].classList.add('splash-element-exit');
        }
      });

      // After bloom, slide entire splash upward
      setTimeout(function () {
        splash.classList.add('hidden');
        setTimeout(function () {
          splash.style.display = 'none';
          revealInViewport();
          startPetals();
        }, 1100);
      }, 650);
    }

    // Manual click
    btn.addEventListener('click', function () {
      openInvite();
    });

    // Auto-open after 8 seconds if user hasn't clicked
    setTimeout(function () {
      openInvite();
    }, 8000);
  }

  /* ── 2. Scroll Reveal (IntersectionObserver) ───────────── */
  var observer;

  function initScrollReveal() {
    observer = new IntersectionObserver(function (entries) {
      // Collect newly intersecting entries
      var visible = [];
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          visible.push(entry.target);
          observer.unobserve(entry.target);
        }
      });
      // Stagger them 150ms apart
      visible.forEach(function (el, i) {
        setTimeout(function () {
          el.classList.add('visible');
        }, i * 150);
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });

    var els = document.querySelectorAll('.fade-in-up');
    for (var i = 0; i < els.length; i++) observer.observe(els[i]);
  }

  function revealInViewport() {
    var els = document.querySelectorAll('.fade-in-up:not(.visible)');
    var delay = 0;
    for (var i = 0; i < els.length; i++) {
      if (els[i].getBoundingClientRect().top < window.innerHeight - 50) {
        (function (el, d) {
          setTimeout(function () { el.classList.add('visible'); }, d);
        })(els[i], delay);
        delay += 250; // 250ms stagger between each element
      }
    }
  }

  /* ── 3. Music Toggle + Visualizer ───────────────────────── */
  var vizAnimId, vizBars, vizTargets;

  function initMusicToggle() {
    var btn = document.getElementById('music-toggle-btn');
    var audio = document.getElementById('bg-music');
    var canvas = document.getElementById('music-visualizer');
    if (!btn || !audio) return;

    btn.addEventListener('click', function () {
      if (audio.paused) {
        audio.play();
        btn.classList.remove('music-paused');
        if (canvas) startVisualizer(canvas);
      } else {
        audio.pause();
        btn.classList.add('music-paused');
        stopVisualizer(canvas);
      }
    });
  }

  function startVisualizer(canvas) {
    var ctx = canvas.getContext('2d');
    var W = canvas.width;
    var H = canvas.height;
    var cx = W / 2;
    var cy = H / 2;
    var innerR = 27;
    var barCount = 36;

    // Initialize bar heights
    if (!vizBars) {
      vizBars = new Array(barCount);
      vizTargets = new Array(barCount);
      for (var i = 0; i < barCount; i++) {
        vizBars[i] = 0;
        vizTargets[i] = 0;
      }
    }

    // Generate new random targets periodically (simulate beat)
    var beatInterval = setInterval(function () {
      var peak = Math.random() * 0.6 + 0.4; // overall energy 0.4-1.0
      for (var i = 0; i < barCount; i++) {
        // Neighboring bars are correlated for realism
        var base = peak * (0.5 + Math.random() * 0.5);
        // Bass frequencies (first third) are stronger
        if (i < barCount / 3) base *= 1.3;
        vizTargets[i] = Math.min(1, base);
      }
    }, 120);

    function draw() {
      vizAnimId = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, W, H);

      for (var i = 0; i < barCount; i++) {
        // Smooth interpolation toward target
        vizBars[i] += (vizTargets[i] - vizBars[i]) * 0.18;

        var value = vizBars[i];
        var barH = 2 + value * 12;
        var angle = (i / barCount) * Math.PI * 2 - Math.PI / 2;

        var x1 = cx + Math.cos(angle) * innerR;
        var y1 = cy + Math.sin(angle) * innerR;
        var x2 = cx + Math.cos(angle) * (innerR + barH);
        var y2 = cy + Math.sin(angle) * (innerR + barH);

        // Gold color with intensity-based alpha
        var alpha = 0.4 + value * 0.6;
        ctx.strokeStyle = 'rgba(180, 40, 40, ' + alpha.toFixed(2) + ')';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      // Glow ring
      var avg = 0;
      for (var j = 0; j < barCount; j++) avg += vizBars[j];
      avg /= barCount;
      if (avg > 0.15) {
        ctx.beginPath();
        ctx.arc(cx, cy, innerR + 1, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(180, 40, 40, ' + (avg * 0.45).toFixed(2) + ')';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    // Store interval ID for cleanup
    canvas._beatInterval = beatInterval;
    draw();
  }

  function stopVisualizer(canvas) {
    if (vizAnimId) {
      cancelAnimationFrame(vizAnimId);
      vizAnimId = null;
    }
    if (canvas && canvas._beatInterval) {
      clearInterval(canvas._beatInterval);
      canvas._beatInterval = null;
    }
    // Fade bars to zero
    if (vizTargets) {
      for (var i = 0; i < vizTargets.length; i++) vizTargets[i] = 0;
    }
    // Clear after a short delay to allow fade
    setTimeout(function () {
      if (canvas) {
        var ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }, 400);
  }

  /* ── 4. Parallax Depth ─────────────────────────────────── */
  function initParallax() {
    var elements = document.querySelectorAll('[data-parallax]');
    if (!elements.length) return;

    // Respect user motion preferences
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var items = [];
    for (var i = 0; i < elements.length; i++) {
      items.push({
        el: elements[i],
        speed: parseFloat(elements[i].dataset.parallax) || 0,
        baseTransform: elements[i].dataset.baseTransform || ''
      });
    }

    var ticking = false;

    function update() {
      var winH = window.innerHeight;
      var halfH = winH * 0.5;

      for (var i = 0; i < items.length; i++) {
        var rect = items[i].el.getBoundingClientRect();

        // Skip elements far outside viewport
        if (rect.bottom < -300 || rect.top > winH + 300) continue;

        // Offset based on distance from viewport center
        var center = rect.top + rect.height * 0.5;
        var offset = (center - halfH) * items[i].speed;

        // Compose: parallax translate + original CSS transform (e.g. scaleY(-1))
        var transform = 'translate3d(0,' + offset.toFixed(1) + 'px,0)';
        if (items[i].baseTransform) {
          transform += ' ' + items[i].baseTransform;
        }

        items[i].el.style.transform = transform;
      }
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }, { passive: true });

    // Initial position
    requestAnimationFrame(update);
  }

  /* ── 5. Lightbox Gallery ──────────────────────────────── */
  var galleryImages = [];
  var galleryIndex = 0;
  var swipeStartX = 0;
  var swipeStartY = 0;
  var swiping = false;

  function initLightbox() {
    var lb = document.getElementById('lightbox');
    if (!lb) return;

    // Collect all album images
    var imgs = document.querySelectorAll('.grid img[alt^="Ảnh cưới"]');
    galleryImages = [];
    for (var i = 0; i < imgs.length; i++) {
      galleryImages.push(imgs[i].src);
    }

    // Close on backdrop click
    lb.addEventListener('click', function (e) {
      if (e.target === lb) {
        window.closeLightbox();
      }
    });

    // Keyboard navigation
    document.addEventListener('keydown', function (e) {
      if (lb.classList.contains('hidden')) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); window.navigateLightbox(1); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); window.navigateLightbox(-1); }
      else if (e.key === 'Escape') { window.closeLightbox(); }
    });

    // Touch swipe on the lightbox
    lb.addEventListener('touchstart', function (e) {
      if (e.touches.length === 1) {
        swipeStartX = e.touches[0].clientX;
        swipeStartY = e.touches[0].clientY;
        swiping = true;
      }
    }, { passive: true });

    lb.addEventListener('touchend', function (e) {
      if (!swiping) return;
      swiping = false;
      var dx = e.changedTouches[0].clientX - swipeStartX;
      var dy = e.changedTouches[0].clientY - swipeStartY;
      // Only trigger if horizontal swipe > 50px and more horizontal than vertical
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) window.navigateLightbox(1);  // swipe left → next
        else window.navigateLightbox(-1);          // swipe right → prev
      }
    }, { passive: true });
  }

  function showGalleryImage(index, direction) {
    var img = document.getElementById('lightbox-img');
    var counter = document.getElementById('lb-counter');
    if (!img) return;

    galleryIndex = index;

    // Slide animation
    if (direction) {
      img.style.opacity = '0';
      img.style.transform = direction > 0 ? 'translateX(-30px) scale(0.97)' : 'translateX(30px) scale(0.97)';
      setTimeout(function () {
        img.src = galleryImages[index];
        img.style.transform = direction > 0 ? 'translateX(30px) scale(0.97)' : 'translateX(-30px) scale(0.97)';
        requestAnimationFrame(function () {
          img.style.opacity = '1';
          img.style.transform = 'translateX(0) scale(1)';
        });
      }, 150);
    } else {
      img.src = galleryImages[index];
    }

    if (counter) {
      counter.textContent = (index + 1) + ' / ' + galleryImages.length;
    }
  }

  window.openLightbox = function (index) {
    var lb = document.getElementById('lightbox');
    var img = document.getElementById('lightbox-img');
    if (!lb || !img) return;

    galleryIndex = index;
    img.src = galleryImages[index];

    var counter = document.getElementById('lb-counter');
    if (counter) counter.textContent = (index + 1) + ' / ' + galleryImages.length;

    lb.classList.remove('hidden');
    lb.classList.add('flex');

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        lb.classList.remove('opacity-0');
        img.classList.remove('scale-95');
        img.classList.add('scale-100');
      });
    });
  };

  window.closeLightbox = function () {
    var lb = document.getElementById('lightbox');
    var img = document.getElementById('lightbox-img');
    if (!lb || !img) return;

    lb.classList.add('opacity-0');
    img.classList.remove('scale-100');
    img.classList.add('scale-95');

    setTimeout(function () {
      lb.classList.remove('flex');
      lb.classList.add('hidden');
      img.src = '';
    }, 300);
  };

  window.navigateLightbox = function (dir) {
    var newIndex = galleryIndex + dir;
    if (newIndex < 0) newIndex = galleryImages.length - 1;
    if (newIndex >= galleryImages.length) newIndex = 0;
    showGalleryImage(newIndex, dir);
  };

  /* ── 7. Falling Chữ Hỷ ──────────────────────────────── */
  function initPetals() { /* activated after splash */ }

  function startPetals() {
    var container = document.getElementById('petals-container');
    if (!container) return;
    container.classList.add('active');

    var count = 8;

    for (var i = 0; i < count; i++) {
      var el = document.createElement('img');
      el.src = './images/chu-hy.webp';
      el.className = 'chu-hy';
      el.alt = '';

      var left = Math.random() * 100;
      var size = 12 + Math.random() * 10; // 12-22px
      var fallDuration = 12 + Math.random() * 14;
      var swayDuration = 5 + Math.random() * 5;
      var delay = Math.random() * 25;
      var opacity = 0.10 + Math.random() * 0.18; // 0.10-0.28

      el.style.left = left + '%';
      el.style.width = size + 'px';
      el.style.height = 'auto';
      el.style.setProperty('--hy-opacity', opacity);
      el.style.animationDuration = fallDuration + 's, ' + swayDuration + 's';
      el.style.animationDelay = delay + 's, ' + (delay + 0.5) + 's';

      container.appendChild(el);
    }
  }
})();
