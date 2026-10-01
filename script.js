(() => {
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.body.classList.add('locked');
  const loader = $('#loader');
  const revealHero = () => $$('.hero .reveal').forEach(el => el.classList.add('in-view'));
  window.addEventListener('load', () => {
    const wait = Math.max(0, 2000 - performance.now());
    setTimeout(() => {
      loader?.classList.add('is-hidden');
      document.body.classList.remove('locked');
      revealHero();
    }, wait);
  });

  const header = $('.site-header');
  const toggle = $('#menuToggle');
  const mobileNav = $('#mobileNav');
  const progress = $('#scrollProgress');

  const syncScrollUI = () => {
    header?.classList.toggle('scrolled', window.scrollY > 30);
    const max = document.documentElement.scrollHeight - innerHeight;
    if (progress) progress.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + '%';
  };
  syncScrollUI();
  window.addEventListener('scroll', syncScrollUI, { passive: true });

  toggle?.addEventListener('click', () => {
    const open = mobileNav?.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(!!open));
  });
  $$('a,button', mobileNav).forEach(el => el.addEventListener('click', () => {
    mobileNav?.classList.remove('open');
    toggle?.setAttribute('aria-expanded', 'false');
  }));

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('in-view');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });
  $$('.reveal:not(.hero .reveal)').forEach(el => observer.observe(el));

  const counterObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = Number(el.dataset.counter || 0);
      if (reduced) {
        el.textContent = target;
      } else {
        const start = performance.now();
        const duration = 1200;
        const tick = now => {
          const p = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(target * eased);
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
      counterObserver.unobserve(el);
    });
  }, { threshold: .5 });
  $$('[data-counter]').forEach(el => counterObserver.observe(el));

  const parallax = $$('.parallax');
  let parallaxTicking = false;
  const moveParallax = () => {
    if (reduced) return;
    parallax.forEach(el => {
      const rect = el.parentElement.getBoundingClientRect();
      const speed = Number(el.dataset.speed || .08);
      const y = (rect.top - innerHeight / 2) * speed;
      el.style.transform = 'translate3d(0,' + y + 'px,0) scale(1.04)';
    });
    parallaxTicking = false;
  };
  window.addEventListener('scroll', () => {
    if (!parallaxTicking) {
      requestAnimationFrame(moveParallax);
      parallaxTicking = true;
    }
  }, { passive: true });
  moveParallax();

  // Subtle card depth only; native cursor is preserved for clarity.
  if (window.matchMedia('(pointer:fine)').matches && !reduced) {
    $$('.tilt-card').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - .5;
        const py = (e.clientY - r.top) / r.height - .5;
        el.style.transform = 'perspective(1100px) rotateY(' + (px * 1.8) + 'deg) rotateX(' + (-py * 1.6) + 'deg)';
      });
      el.addEventListener('pointerleave', () => el.style.transform = '');
    });
  }

  // Before / after comparison.
  const ba = $('#beforeAfter');
  const range = $('#baRange');
  const beforeLayer = $('#beforeLayer');
  const baHandle = $('#baHandle');
  const syncBA = () => {
    if (!ba || !range || !beforeLayer || !baHandle) return;
    const value = Number(range.value);
    beforeLayer.style.width = value + '%';
    baHandle.style.left = value + '%';
    const img = $('img', beforeLayer);
    if (img) img.style.width = ba.clientWidth + 'px';
  };
  range?.addEventListener('input', syncBA);
  window.addEventListener('resize', syncBA);
  syncBA();

  // Swipeable animated carousels.
  const carouselStates = new Map();

  const nearestIndex = (track, slides) => {
    const left = track.scrollLeft;
    let best = 0;
    let distance = Infinity;
    slides.forEach((slide, index) => {
      const d = Math.abs(slide.offsetLeft - left);
      if (d < distance) { distance = d; best = index; }
    });
    return best;
  };

  const setupCarousel = track => {
    const name = track.dataset.carousel;
    if (!name) return;
    const slides = [...track.children];
    if (!slides.length) return;

    const dotsWrap = document.querySelector('[data-carousel-dots="' + name + '"]');
    const prev = document.querySelector('[data-carousel-prev="' + name + '"]');
    const next = document.querySelector('[data-carousel-next="' + name + '"]');
    let active = 0;
    let autoTimer = null;
    let userInteracting = false;

    if (dotsWrap) {
      dotsWrap.innerHTML = '';
      slides.forEach((_, index) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.setAttribute('aria-label', 'Go to slide ' + (index + 1));
        dot.addEventListener('click', () => goTo(index, true));
        dotsWrap.appendChild(dot);
      });
    }

    const sync = () => {
      active = nearestIndex(track, slides);
      if (dotsWrap) [...dotsWrap.children].forEach((dot, index) => dot.classList.toggle('active', index === active));
    };

    const goTo = (index, manual = false) => {
      if (!slides.length) return;
      active = (index + slides.length) % slides.length;
      track.scrollTo({ left: slides[active].offsetLeft, behavior: reduced ? 'auto' : 'smooth' });
      if (manual) {
        userInteracting = true;
        restartAuto();
        setTimeout(() => { userInteracting = false; }, 1400);
      }
      requestAnimationFrame(sync);
    };

    const restartAuto = () => {
      if (autoTimer) clearInterval(autoTimer);
      const delay = Number(track.dataset.autoplay || 0);
      if (!delay || reduced) return;
      autoTimer = setInterval(() => {
        if (!document.hidden && !userInteracting && !track.matches(':hover')) goTo(active + 1);
      }, delay);
    };

    let scrollTimer;
    track.addEventListener('scroll', () => {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(sync, 80);
    }, { passive: true });
    track.addEventListener('pointerdown', () => { userInteracting = true; }, { passive: true });
    track.addEventListener('pointerup', () => {
      setTimeout(() => { userInteracting = false; }, 900);
      restartAuto();
    }, { passive: true });
    track.addEventListener('touchstart', () => { userInteracting = true; }, { passive: true });
    track.addEventListener('touchend', () => {
      setTimeout(() => { userInteracting = false; }, 900);
      restartAuto();
    }, { passive: true });

    prev?.addEventListener('click', () => goTo(active - 1, true));
    next?.addEventListener('click', () => goTo(active + 1, true));

    carouselStates.set(name, { track, slides, goTo, sync });
    sync();
    restartAuto();
  };

  $('[data-carousel]').forEach(setupCarousel);

  // Gallery filtering.
  $$('.gallery-filters button').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.gallery-filters button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;
      const items = Array.from(document.querySelectorAll('.gallery-item'));
      items.forEach(item => {
        const hidden = filter !== 'all' && item.dataset.cat !== filter;
        item.classList.toggle('filtered-out', hidden);
        item.style.display = hidden ? 'none' : '';
      });
      const galleryState = carouselStates.get('gallery');
      if (galleryState) {
        galleryState.track.scrollTo({ left: 0, behavior: reduced ? 'auto' : 'smooth' });
        setTimeout(galleryState.sync, 220);
      }
    });
  });

  // Gallery lightbox.
  const galleryModal = $('#galleryModal');
  const closeGallery = () => {
    galleryModal?.classList.remove('open');
    galleryModal?.setAttribute('aria-hidden', 'true');
    if (!serviceModal?.classList.contains('open') && !bookingModal?.classList.contains('open')) document.body.classList.remove('locked');
  };
  Array.from(document.querySelectorAll('.gallery-item')).forEach(item => {
    item.setAttribute('tabindex', '0');
    item.setAttribute('role', 'button');
    const open = () => {
      const img = $('img', item);
      if (!img || !galleryModal) return;
      $('#galleryModalImg').src = img.src;
      $('#galleryModalImg').alt = img.alt;
      $('#galleryModalCaption').textContent = $('figcaption', item)?.textContent || 'Salon work';
      galleryModal.classList.add('open');
      galleryModal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('locked');
    };
    item.addEventListener('click', open);
    item.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  });
  $('[data-close-gallery]')?.addEventListener('click', closeGallery);
  galleryModal?.addEventListener('click', e => { if (e.target === galleryModal) closeGallery(); });

  // Concierge.
  const concierge = $('#concierge');
  const conciergeToggle = $('#conciergeToggle');
  conciergeToggle?.addEventListener('click', () => {
    const open = concierge?.classList.toggle('open');
    conciergeToggle.setAttribute('aria-expanded', String(!!open));
  });
  $$('#conciergePanel a, #conciergePanel button').forEach(el => el.addEventListener('click', () => {
    concierge?.classList.remove('open');
    conciergeToggle?.setAttribute('aria-expanded', 'false');
  }));

  // Service detail modal.
  const serviceData = {
    cut: {
      title: 'Signature Cut & Finish',
      text: 'A consultation-led haircut designed around face shape, texture, natural movement and how much styling you want to do at home.',
      time: '60–75 min',
      maintenance: '6–10 weeks',
      price: '₹900',
      ideal: 'Ideal for: shape refreshes, restyles, fringe work and clients who want a more intentional everyday silhouette.'
    },
    colour: {
      title: 'Colour Atelier',
      text: 'From high-shine global colour to dimensional balayage and tonal glossing, placement is planned around skin tone, haircut and maintenance preference.',
      time: '2–5 hours',
      maintenance: '4–12 weeks',
      price: '₹2,500',
      ideal: 'Ideal for: tonal changes, dimension, grey blending, glossing and larger colour transformations.'
    },
    smooth: {
      title: 'Keratin & Smooth',
      text: 'A smoothing consultation followed by the most suitable frizz-control ritual for your density, texture and previous chemical history.',
      time: '2–4 hours',
      maintenance: '3–5 months',
      price: '₹4,500',
      ideal: 'Ideal for: reducing frizz, improving manageability and creating a smoother daily finish.'
    },
    spa: {
      title: 'Hair Spa & Repair',
      text: 'Scalp-led cleansing and targeted conditioning chosen for hydration, repair, softness or post-chemical recovery.',
      time: '45–75 min',
      maintenance: '2–4 weeks',
      price: '₹1,200',
      ideal: 'Ideal for: dryness, roughness, stressed lengths, post-colour care and a reset between major services.'
    },
    bridal: {
      title: 'Bridal & Occasion',
      text: 'Trial-led styling that considers outfit, jewellery, headwear, weather, photography and the full event timeline.',
      time: 'By consultation',
      maintenance: 'Event day',
      price: 'Consultation',
      ideal: 'Ideal for: weddings, receptions, parties, pre-wedding events and editorial occasion styling.'
    },
    men: {
      title: "Men's Grooming",
      text: 'A contemporary cut and finish with optional beard detailing, designed to look sharp on day one and grow out cleanly.',
      time: '45–60 min',
      maintenance: '3–6 weeks',
      price: '₹650',
      ideal: 'Ideal for: classic and modern cuts, texture work, fades, beard refinement and low-maintenance styling.'
    }
  };

  const serviceModal = $('#serviceModal');
  let activeService = '';
  const openService = key => {
    const data = serviceData[key];
    if (!data || !serviceModal) return;
    activeService = data.title;
    $('#serviceModalTitle').textContent = data.title;
    $('#serviceModalText').textContent = data.text;
    $('#serviceTime').textContent = data.time;
    $('#serviceMaintenance').textContent = data.maintenance;
    $('#servicePrice').textContent = data.price;
    $('#serviceIdeal').textContent = data.ideal;
    serviceModal.classList.add('open');
    serviceModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('locked');
  };
  const closeService = () => {
    serviceModal?.classList.remove('open');
    serviceModal?.setAttribute('aria-hidden', 'true');
    if (!$('#bookingModal')?.classList.contains('open')) document.body.classList.remove('locked');
  };
  $$('[data-service]').forEach(btn => btn.addEventListener('click', () => openService(btn.dataset.service)));
  $('[data-close-modal]')?.addEventListener('click', closeService);
  serviceModal?.addEventListener('click', e => { if (e.target === serviceModal) closeService(); });

  // Booking concierge.
  const bookingModal = $('#bookingModal');
  const bookingForm = $('#bookingForm');
  const steps = $$('.booking-step');
  const titles = ['What are we creating?', 'Who would you like to see?', 'When works for you?', 'Almost yours.'];
  const state = { step: 1, service: '', stylist: 'No preference' };

  const syncBooking = () => {
    steps.forEach(step => step.classList.toggle('active', Number(step.dataset.step) === state.step));
    $('#bookingStepNo').textContent = String(state.step).padStart(2, '0');
    $('#bookingProgress').style.width = (state.step * 25) + '%';
    $('#bookingTitle').textContent = titles[state.step - 1];
    $('#bookBack').style.visibility = state.step === 1 ? 'hidden' : 'visible';
    $('#bookNext').innerHTML = state.step === 4 ? 'Send to WhatsApp <span>↗</span>' : 'Continue <span>→</span>';
    $$('#bookingForm [data-choice="service"] button').forEach(b => b.classList.toggle('selected', b.dataset.value === state.service));
    $$('#bookingForm [data-choice="stylist"] button').forEach(b => b.classList.toggle('selected', b.dataset.value === state.stylist));
    if (state.step === 4) {
      $('#bookingSummary').innerHTML = '<strong>' + (state.service || 'Consultation') + '</strong><br>' +
        'Stylist: ' + state.stylist + '<br>' +
        'Preferred: ' + ($('#bookDate').value || 'Date not set') + ' · ' + ($('#bookTime').value || 'Time not set');
    }
  };
  const openBooking = trigger => {
    if (!bookingModal) return;
    const preService = trigger?.dataset.servicePreselect;
    const preStylist = trigger?.dataset.stylist;
    if (preService) state.service = preService;
    if (preStylist) state.stylist = preStylist;
    bookingModal.classList.add('open');
    bookingModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('locked');
    syncBooking();
  };
  const closeBooking = () => {
    bookingModal?.classList.remove('open');
    bookingModal?.setAttribute('aria-hidden', 'true');
    if (!serviceModal?.classList.contains('open')) document.body.classList.remove('locked');
  };
  $$('[data-book]').forEach(btn => btn.addEventListener('click', () => openBooking(btn)));
  $('[data-close-booking]')?.addEventListener('click', closeBooking);
  bookingModal?.addEventListener('click', e => { if (e.target === bookingModal) closeBooking(); });

  $('#bookThisService')?.addEventListener('click', () => {
    state.service = activeService;
    closeService();
    openBooking();
  });

  $$('#bookingForm [data-choice] button').forEach(btn => {
    btn.addEventListener('click', () => {
      const group = btn.closest('[data-choice]').dataset.choice;
      if (group === 'service') state.service = btn.dataset.value;
      if (group === 'stylist') state.stylist = btn.dataset.value;
      syncBooking();
    });
  });

  const today = new Date();
  const isoToday = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  if ($('#bookDate')) $('#bookDate').min = isoToday;

  $('#bookBack')?.addEventListener('click', () => {
    if (state.step > 1) { state.step--; syncBooking(); }
  });

  const shakeBooking = () => {
    const card = $('.booking-card');
    card?.animate([{ transform:'translateX(0)' },{ transform:'translateX(-8px)' },{ transform:'translateX(8px)' },{ transform:'translateX(0)' }], { duration:260 });
  };

  $('#bookNext')?.addEventListener('click', () => {
    if (state.step === 1 && !state.service) return shakeBooking();
    if (state.step === 3 && (!$('#bookDate').value || !$('#bookTime').value)) return shakeBooking();

    if (state.step < 4) {
      state.step++;
      syncBooking();
      return;
    }

    const name = $('#bookName').value.trim();
    const phone = $('#bookPhone').value.trim();
    if (!name || !phone) return shakeBooking();

    const note = $('#bookNote').value.trim();
    const message = [
      'Hi Javed Habib Bongaigaon, I would like to request an appointment.',
      '',
      'Service: ' + state.service,
      'Stylist: ' + state.stylist,
      'Preferred date: ' + $('#bookDate').value,
      'Preferred time: ' + $('#bookTime').value,
      'Name: ' + name,
      'Phone: ' + phone,
      note ? 'Note: ' + note : '',
      '',
      'Please confirm availability. Thank you.'
    ].filter(Boolean).join('\n');
    window.open('https://wa.me/919101035255?text=' + encodeURIComponent(message), '_blank', 'noopener');
  });

  // Escape closes active overlays.
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (galleryModal?.classList.contains('open')) closeGallery();
    else if (bookingModal?.classList.contains('open')) closeBooking();
    else if (serviceModal?.classList.contains('open')) closeService();
  });

  $('#year').textContent = new Date().getFullYear();
})();