(() => {
  document.body.classList.add('locked');
  const loader = document.getElementById('loader');
  window.addEventListener('load', () => {
    const elapsed = performance.now();
    const wait = Math.max(0, 2000 - elapsed);
    setTimeout(() => {
      loader.classList.add('is-hidden');
      document.body.classList.remove('locked');
      document.querySelectorAll('.hero .reveal').forEach(el => el.classList.add('in-view'));
    }, wait);
  });

  const header = document.querySelector('.site-header');
  const toggle = document.getElementById('menuToggle');
  const mobileNav = document.getElementById('mobileNav');
  const syncHeader = () => header.classList.toggle('scrolled', window.scrollY > 30);
  syncHeader();
  window.addEventListener('scroll', syncHeader, { passive: true });

  toggle?.addEventListener('click', () => {
    const open = mobileNav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  mobileNav?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    mobileNav.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  }));

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('in-view');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.14, rootMargin: '0px 0px -5% 0px' });
  document.querySelectorAll('.reveal:not(.hero .reveal)').forEach(el => observer.observe(el));

  const counters = [...document.querySelectorAll('[data-counter]')];
  const counterObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = Number(el.dataset.counter || 0);
      const start = performance.now();
      const duration = 1200;
      const tick = now => {
        const p = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased);
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      counterObserver.unobserve(el);
    });
  }, { threshold: .5 });
  counters.forEach(el => counterObserver.observe(el));

  const parallax = [...document.querySelectorAll('.parallax')];
  let ticking = false;
  const moveParallax = () => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    parallax.forEach(el => {
      const rect = el.parentElement.getBoundingClientRect();
      const speed = Number(el.dataset.speed || .1);
      const y = (rect.top - window.innerHeight / 2) * speed;
      el.style.transform = `translate3d(0, ${y}px, 0) scale(1.04)`;
    });
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(moveParallax); ticking = true; }
  }, { passive: true });
  moveParallax();

  document.getElementById('year').textContent = new Date().getFullYear();
})();
