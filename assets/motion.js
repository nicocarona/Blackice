// Animaciones de la portada, scroll horizontal y textos. Requiere GSAP (+ScrollTrigger, SplitText) y Lenis.
// Si algo no carga o el usuario pidió reducir movimiento, la página queda estática y legible.
(function () {
  var hideLoader = window.__hideLoader || function () {};
  if (!window.gsap || !window.ScrollTrigger || !window.SplitText) { hideLoader(); return; }

  gsap.registerPlugin(ScrollTrigger, SplitText);
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;

  if (reduce) { hideLoader(); return; }
  root.classList.add('anim');

  // Scroll suave con inercia, sincronizado con ScrollTrigger
  var lenis = null;
  if (window.Lenis) {
    lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a) return;
      var target = a.getAttribute('href') === '#top' ? 0 : document.querySelector(a.getAttribute('href'));
      if (target === null) return;
      e.preventDefault();
      lenis.scrollTo(target, { duration: 1.4 });
    });
  }

  // Divide un elemento en letras dentro de una máscara para que suban desde abajo
  function chars(el) {
    var st = SplitText.create(el, { type: 'words,chars', mask: 'words' });
    // Dejar espacio en la máscara para tildes y descendentes (Á, ñ, ¿)
    (st.masks || []).forEach(function (m) {
      m.style.paddingTop = '.22em'; m.style.marginTop = '-.22em';
      m.style.paddingBottom = '.1em'; m.style.marginBottom = '-.1em';
    });
    return st.chars;
  }

  // ---------- Precargador: contador 0–100 y cortina hacia arriba ----------
  var heroChars = [];
  document.querySelectorAll('#hero-title .sans, #hero-title .serif').forEach(function (el) {
    heroChars = heroChars.concat(chars(el));
  });
  gsap.set(heroChars, { yPercent: 115 });
  gsap.set('.p-intro .fade', { autoAlpha: 0, y: 24 });
  gsap.set('#status', { autoAlpha: 0 });

  if (lenis) lenis.stop();
  var counter = { v: 0 };
  var count = document.getElementById('count');
  var loader = document.getElementById('loader');
  gsap.timeline({ onComplete: function () { hideLoader(); if (lenis) lenis.start(); ScrollTrigger.refresh(); } })
    .to(counter, { v: 100, duration: 1.6, ease: 'power2.inOut', onUpdate: function () { count.textContent = Math.round(counter.v); } }, 0)
    .to('#bar', { scaleX: 1, duration: 1.6, ease: 'power2.inOut' }, 0)
    .to('#loader img', { scale: 0.92, autoAlpha: 0, duration: 0.5, ease: 'power2.in' }, 1.7)
    .to('.loader-count', { yPercent: 60, autoAlpha: 0, duration: 0.5, ease: 'power2.in' }, 1.7)
    .to(loader, { yPercent: -100, duration: 1, ease: 'power4.inOut' }, 2.05)
    .to(heroChars, { yPercent: 0, duration: 1.1, ease: 'power4.out', stagger: 0.022 }, 2.45)
    .to('#status', { autoAlpha: 1, duration: 0.6, ease: 'power2.out' }, 2.7)
    .to('.p-intro .fade', { autoAlpha: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.1 }, 2.9);

  // ---------- Escenas que dependen del tamaño de pantalla ----------
  var mm = gsap.matchMedia();
  ScrollTrigger.config({ ignoreMobileResize: true });

  mm.add('(min-width: 0px)', function () {
    // Portada: los paneles avanzan de lado mientras bajas
    var heroTrack = document.getElementById('hero-track');
    var heroTween = gsap.to(heroTrack, {
      x: function () { return -(heroTrack.scrollWidth - innerWidth); },
      ease: 'none',
      scrollTrigger: {
        trigger: '#hero', pin: true, scrub: 1, anticipatePin: 1, invalidateOnRefresh: true,
        end: function () { return '+=' + (heroTrack.scrollWidth - innerWidth); }
      }
    });
    // El logo y las botellas entran con un pequeño desfase (profundidad)
    gsap.from('.p-logo img', { scale: 0.8, rotate: -4, ease: 'none', scrollTrigger: { trigger: '.p-logo', containerAnimation: heroTween, start: 'left right', end: 'center center', scrub: true } });
    gsap.from('.p-shots figure', { yPercent: 30, ease: 'none', stagger: 0.15, scrollTrigger: { trigger: '.p-shots', containerAnimation: heroTween, start: 'left right', end: 'right right', scrub: true } });

    // Catálogo: galería horizontal fijada
    var catTrack = document.getElementById('cat-track');
    gsap.to(catTrack, {
      x: function () { return -(catTrack.scrollWidth - innerWidth); },
      ease: 'none',
      scrollTrigger: {
        trigger: '#catalogo', pin: true, scrub: 1, anticipatePin: 1, invalidateOnRefresh: true,
        end: function () { return '+=' + (catTrack.scrollWidth - innerWidth); }
      }
    });

  });

  mm.add('(min-width: 901px)', function () {
    // Botellas flotantes en la sección de pedido
    document.querySelectorAll('.float').forEach(function (el) {
      gsap.to(el, { yPercent: parseFloat(el.dataset.speed) * 160, rotate: parseFloat(el.dataset.speed) * 30, ease: 'none', scrollTrigger: { trigger: '.order', start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  });

  // Manifiesto: cada palabra se enciende al pasar
  var words = SplitText.create('#manifesto-text', { type: 'words' }).words;
  gsap.fromTo(words, { opacity: 0.14 }, {
    opacity: 1, ease: 'none', stagger: 0.1,
    scrollTrigger: { trigger: '.manifesto', start: 'top 75%', end: 'bottom 60%', scrub: true }
  });

  // Valores: cada fila se desliza en sentido contrario
  document.querySelectorAll('.v-row').forEach(function (row) {
    var d = parseFloat(row.dataset.x) * (innerWidth < 901 ? 0.35 : 1);
    gsap.fromTo(row, { xPercent: d }, { xPercent: -d, ease: 'none', scrollTrigger: { trigger: row, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  // Títulos que suben letra por letra al entrar
  document.querySelectorAll('.cat-intro h2 > span, .order h2 > span, .hours h2 .serif, .values .word').forEach(function (el) {
    var c = chars(el);
    gsap.from(c, { yPercent: 115, duration: 1, ease: 'power4.out', stagger: 0.03, scrollTrigger: { trigger: el, start: 'top 85%' } });
  });

  // Títulos que se arman con letras aleatorias
  var pool = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ¿?';
  document.querySelectorAll('.scramble').forEach(function (el) {
    var final = el.textContent;
    gsap.set(el, { autoAlpha: 0 });
    ScrollTrigger.create({
      trigger: el, start: 'top 85%', once: true,
      onEnter: function () {
        var p = { v: 0 };
        gsap.set(el, { autoAlpha: 1 });
        gsap.to(p, {
          v: 1, duration: 1.3, ease: 'power1.out',
          onUpdate: function () {
            var n = Math.floor(p.v * final.length);
            el.textContent = final.slice(0, n) + final.slice(n).replace(/[^\s]/g, function () { return pool[(Math.random() * pool.length) | 0]; });
          },
          onComplete: function () { el.textContent = final; }
        });
      }
    });
  });

  // Tarjetas de horario
  gsap.from('.hour', { y: 40, autoAlpha: 0, duration: 0.9, ease: 'power3.out', stagger: 0.12, scrollTrigger: { trigger: '.hours-grid', start: 'top 85%' } });

  // Firma gigante: las letras se estiran hacia abajo al llegar al final
  gsap.fromTo('#giant span', { scaleY: 0.6 }, {
    scaleY: function (i) { return [1.9, 1.4, 2.2, 1.6, 1.8, 1, 2.1, 1.5, 1.9][i] || 1.6; },
    ease: 'none', stagger: 0.04,
    scrollTrigger: { trigger: 'footer', start: 'top bottom', end: 'bottom bottom', scrub: true }
  });

  // Recalcular medidas cuando cargan las fuentes y las imágenes
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
