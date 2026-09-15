/*=============== SHOW MENU & BLUR HEADER ===============*/
const navMenu = document.getElementById('nav-menu');
const navToggle = document.getElementById('nav-toggle');
const navClose = document.getElementById('nav-close');

// Menu Show
if (navToggle) {
  navToggle.addEventListener('click', () => {
    navMenu.classList.add('show-menu');
  });
}

// Menu Hidden
if (navClose) {
  navClose.addEventListener('click', () => {
    navMenu.classList.remove('show-menu');
  });
}

// Remove Menu on Link Click
const navLinks = document.querySelectorAll('.nav__link');
navLinks.forEach(link => {
  link.addEventListener('click', () => {
    navMenu.classList.remove('show-menu');
  });
});

// Blur Header on Scroll
const blurHeader = () => {
  const header = document.getElementById('header');
  if (header) {
    window.scrollY >= 50 ? header.classList.add('blur-header') : header.classList.remove('blur-header');
  }
};
window.addEventListener('scroll', blurHeader);

/*=============== HOME SPLIT TEXT ===============*/
const splitText = document.getElementById('home-split');
if (splitText) {
  const text = splitText.textContent.trim();
  splitText.innerHTML = text
    .split('')
    .map(char => `<span class="letter">${char}</span>`)
    .join('');

  if (typeof anime !== 'undefined') {
    anime({
      targets: '.home__split .letter',
      opacity: [0, 1],
      translateY: [24, 0],
      easing: 'easeOutExpo',
      duration: 750,
      delay: (el, i) => 60 * (i + 1),
      loop: true,
      direction: 'alternate',
      endDelay: 1800
    });
  }
}

/*=============== SWIPER PROJECTS ===============*/
let swiperProjects = new Swiper('.projects__container', {
  loop: true,
  spaceBetween: 24,
  grabCursor: true,
  navigation: {
    nextEl: '.swiper-button-next',
    prevEl: '.swiper-button-prev',
  },
  pagination: {
    el: '.swiper-pagination',
    clickable: true,
  },
  breakpoints: {
    1150: {
      slidesPerView: 1,
      spaceBetween: 32,
    }
  }
});

/*=============== COPY EMAIL IN CONTACT ===============*/
const copyBtn = document.getElementById('contact-copy-btn');
const copyText = document.getElementById('contact-copy-text');
const emailElement = document.getElementById('contact-email');

if (copyBtn && emailElement) {
  copyBtn.addEventListener('click', async () => {
    const email = emailElement.textContent.trim();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(email);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = email;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      
      const originalText = copyText ? copyText.textContent : 'Copy email';
      if (copyText) copyText.textContent = 'Copied!';
      copyBtn.style.backgroundColor = 'var(--first-color-alt)';
      
      setTimeout(() => {
        if (copyText) copyText.textContent = originalText;
        copyBtn.style.backgroundColor = '';
      }, 2000);
    } catch (err) {
      console.warn('Could not copy email:', err);
    }
  });
}

/*=============== DIRECT CONTACT INQUIRY FORM ===============*/
const inquiryForm = document.getElementById('contact-inquiry-form');
const inquiryStatus = document.getElementById('inquiry-status');
const inquirySubmitBtn = document.getElementById('inquiry-submit-btn');

if (inquiryForm) {
  inquiryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('inquiry-name').value.trim();
    const email = document.getElementById('inquiry-email').value.trim();
    const subject = document.getElementById('inquiry-subject').value.trim();
    const message = document.getElementById('inquiry-message').value.trim();

    if (!name || !email || !message) return;

    const originalBtnContent = inquirySubmitBtn.innerHTML;
    inquirySubmitBtn.disabled = true;
    inquirySubmitBtn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Sending...';
    inquiryStatus.style.display = 'none';

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message })
      });

      if (response.ok) {
        inquiryStatus.style.display = 'block';
        inquiryStatus.style.color = 'hsl(145, 65%, 52%)';
        inquiryStatus.innerHTML = '<i class="ri-checkbox-circle-line"></i> Message sent successfully! Furqan will get back to you soon.';
        inquiryForm.reset();
      } else {
        const data = await response.json();
        inquiryStatus.style.display = 'block';
        inquiryStatus.style.color = 'hsl(355, 75%, 60%)';
        inquiryStatus.textContent = data.error || 'Failed to send message. Please try again.';
      }
    } catch (err) {
      inquiryStatus.style.display = 'block';
      inquiryStatus.style.color = 'hsl(355, 75%, 60%)';
      inquiryStatus.textContent = 'Network error. Please try again.';
    } finally {
      inquirySubmitBtn.disabled = false;
      inquirySubmitBtn.innerHTML = originalBtnContent;
    }
  });
}

/*=============== FUTURE POSTS TOPIC FILTERING ===============*/
const postFilterBtns = document.querySelectorAll('.posts__filter-btn');
const postCards = document.querySelectorAll('.post__card');

if (postFilterBtns.length > 0 && postCards.length > 0) {
  postFilterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      postFilterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filterVal = btn.getAttribute('data-filter');

      postCards.forEach(card => {
        const category = card.getAttribute('data-category');
        if (filterVal === 'all' || category === filterVal) {
          card.style.display = 'flex';
          card.style.opacity = '1';
        } else {
          card.style.display = 'none';
          card.style.opacity = '0';
        }
      });
    });
  });
}

/*=============== DYNAMIC PORTFOLIO SYNC (FROM ADMIN) ===============*/
async function syncPortfolioData() {
  try {
    const res = await fetch('/api/portfolio');
    if (!res.ok) return;
    const data = await res.json();
    if (!data || !data.profile) return;

    const p = data.profile;
    // Update contact elements if altered in admin
    if (p.email && emailElement) {
      emailElement.textContent = p.email;
    }
    const bookingBtn = document.getElementById('contact-booking-btn');
    if (p.calendlyUrl && bookingBtn) {
      bookingBtn.href = p.calendlyUrl;
    }
    const heroBookBtn = document.getElementById('hero-booking-btn');
    if (p.calendlyUrl && heroBookBtn) {
      heroBookBtn.href = p.calendlyUrl;
    }
    const aboutBookBtn = document.getElementById('about-booking-btn');
    if (p.calendlyUrl && aboutBookBtn) {
      aboutBookBtn.href = p.calendlyUrl;
    }
    const heroCal = document.getElementById('hero-calendar');
    if (p.calendlyUrl && heroCal) {
      heroCal.href = p.calendlyUrl;
    }
    const cvUrl = p.cvUrl;
    if (cvUrl) {
      const homeCv = document.getElementById('home-resume-btn');
      const aboutCv = document.getElementById('about-resume-btn');
      if (homeCv) homeCv.href = cvUrl;
      if (aboutCv) aboutCv.href = cvUrl;
    }
    const heroLi = document.getElementById('hero-linkedin');
    if (heroLi && p.linkedinUrl) heroLi.href = p.linkedinUrl;
    const heroGh = document.getElementById('hero-github');
    if (heroGh && p.githubUrl) heroGh.href = p.githubUrl;
    const heroWa = document.getElementById('hero-whatsapp');
    const waUrl = p.whatsappUrl || (p.phone ? `https://wa.me/${p.phone.replace(/[^0-9]/g, '')}?text=Hello%20Furqan,%20contacting%20you%20via%20your%20portfolio` : null);
    if (heroWa && waUrl) heroWa.href = waUrl;
    const heroWaBtn = document.getElementById('hero-whatsapp-btn');
    if (heroWaBtn && waUrl) heroWaBtn.href = waUrl;
    const aboutWaBtn = document.getElementById('about-whatsapp-btn');
    if (aboutWaBtn && waUrl) aboutWaBtn.href = waUrl;

    // Hydrate Capstone details if available
    if (data.capstone) {
      const c = data.capstone;
      const titleEl = document.getElementById('capstone-title');
      const instEl = document.getElementById('capstone-institution');
      const absEl = document.getElementById('capstone-abstract');
      const capGh = document.getElementById('capstone-github-link');
      const capDisc = document.getElementById('capstone-discuss-link');
      if (titleEl && c.title) titleEl.textContent = c.title;
      if (instEl && c.institution) instEl.innerHTML = `<i class="ri-building-2-line"></i> ${c.institution}`;
      if (absEl && (c.abstract || c.description)) absEl.textContent = c.abstract || c.description;
      if (capGh && c.repoUrl) capGh.href = c.repoUrl;
      if (capDisc && c.liveDemoUrl) capDisc.href = c.liveDemoUrl;
    }
  } catch (err) {
    // Fail silently; fallback to static markup
  }
}
syncPortfolioData();

/*=============== CURRENT YEAR OF THE FOOTER ===============*/ 
const footerYear = document.getElementById('footer-year');
if (footerYear) {
  footerYear.innerHTML = `&#169; ${new Date().getFullYear()}`;
}

/*=============== SCROLL SECTIONS ACTIVE LINK ===============*/
const sections = document.querySelectorAll('section[id]');

const scrollActive = () => {
  const scrollY = window.pageYOffset;

  sections.forEach(current => {
    const sectionHeight = current.offsetHeight;
    const sectionTop = current.offsetTop - 80;
    const sectionId = current.getAttribute('id');
    const sectionsClass = document.querySelector(`.nav__menu a[href*='${sectionId}']`);

    if (sectionsClass) {
      if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
        sectionsClass.classList.add('active-link');
      } else {
        sectionsClass.classList.remove('active-link');
      }
    }
  });
};
window.addEventListener('scroll', scrollActive);

/*=============== CUSTOM CURSOR ===============*/
const cursor = document.getElementById('custom-cursor');

if (cursor && window.matchMedia('(pointer: fine)').matches) {
  document.addEventListener('mousemove', (e) => {
    cursor.style.left = `${e.clientX}px`;
    cursor.style.top = `${e.clientY}px`;
    cursor.classList.add('cursor--visible');
  });

  document.addEventListener('mouseleave', () => {
    cursor.classList.remove('cursor--visible');
  });

  /* Hide custom cursor on links and interactive elements */
  const interactiveElements = document.querySelectorAll('a, button, .swiper-button-prev, .swiper-button-next');
  interactiveElements.forEach(el => {
    el.addEventListener('mouseenter', () => cursor.classList.add('cursor--hover'));
    el.addEventListener('mouseleave', () => cursor.classList.remove('cursor--hover'));
  });
}

/*=============== SCROLL REVEAL ANIMATION ===============*/
if (typeof ScrollReveal !== 'undefined') {
  const sr = ScrollReveal({
    origin: 'top',
    distance: '60px',
    duration: 2000,
    delay: 200,
    reset: false
  });

  sr.reveal('.home__data');
  sr.reveal('.home__image', { delay: 400, origin: 'bottom' });
  sr.reveal('.about__image', { origin: 'left' });
  sr.reveal('.about__data', { origin: 'right' });
  sr.reveal('.skills__card', { interval: 100 });
  sr.reveal('.projects__container');
  sr.reveal('.experience__card', { interval: 150 });
  sr.reveal('.education__card', { interval: 150 });
  sr.reveal('.certifications__card', { interval: 120 });
  sr.reveal('.capstone__card', { origin: 'bottom', distance: '40px' });
  sr.reveal('.post__card', { interval: 120 });
  sr.reveal('.contact__box', { origin: 'left' });
  sr.reveal('.contact__content', { origin: 'right' });
  sr.reveal('.footer__container');
}

