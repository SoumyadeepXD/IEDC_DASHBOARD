// =====================================================================
// IEDC HALL OF FAME — APPLE KEYNOTE AMBIENT TV DISPLAY ENGINE
// 8s Slide Rotation, Particle Bursts, Count-Up Counters, Burn-in Safety
// =====================================================================

class SparklesEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.animId = null;

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  triggerBurst() {
    this.particles = [];
    const count = 40;
    const centerX = window.innerWidth * 0.25;
    const centerY = window.innerHeight * 0.5;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 6 + 2;
      this.particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        radius: Math.random() * 4 + 2,
        alpha: 1.0,
        color: Math.random() > 0.3 ? '#ffd700' : '#fff5c0',
        decay: Math.random() * 0.015 + 0.01
      });
    }

    if (this.animId) cancelAnimationFrame(this.animId);
    this.animate();
  }

  animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    let activeCount = 0;

    for (let p of this.particles) {
      if (p.alpha <= 0) continue;
      activeCount++;

      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.08; // subtle gravity
      p.alpha -= p.decay;

      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, p.alpha);
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = p.color;
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = p.color;
      this.ctx.fill();
      this.ctx.restore();
    }

    if (activeCount > 0) {
      this.animId = requestAnimationFrame(() => this.animate());
    } else {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }
}

class KeynoteDisplayEngine {
  constructor() {
    this.achievements = [];
    this.currentSlideIndex = 0;
    this.slidesData = [];
    this.slideDuration = 8000; // 8 seconds per slide
    this.isPaused = false;
    this.progressInterval = null;
    this.progressElapsed = 0;
    this.sparkles = null;

    // Controls timeout
    this.mouseTimer = null;

    this.init();
  }

  init() {
    // 1. Initialize Canvas Sparkles
    const canvas = document.getElementById('sparkles-canvas');
    if (canvas) this.sparkles = new SparklesEngine(canvas);

    // 2. Load Initial Data synchronously
    this.loadInitialData();

    // 3. Build Manifest & Render Slides
    this.buildSlidesManifest();
    this.renderSlides();
    this.renderAppleDots();

    // 4. Start Ambient Clock, Autoplay & Listeners
    this.startClock();
    this.startAutoplay();
    this.bindControls();
    this.setupBurnInProtection();

    // 5. Check Remote Updates (non-blocking)
    this.checkRemoteUpdates();
  }

  loadInitialData() {
    let data = [];
    if (typeof INITIAL_ACHIEVEMENTS !== 'undefined' && Array.isArray(INITIAL_ACHIEVEMENTS) && INITIAL_ACHIEVEMENTS.length > 0) {
      data = JSON.parse(JSON.stringify(INITIAL_ACHIEVEMENTS));
    } else if (typeof window !== 'undefined' && Array.isArray(window.INITIAL_ACHIEVEMENTS) && window.INITIAL_ACHIEVEMENTS.length > 0) {
      data = JSON.parse(JSON.stringify(window.INITIAL_ACHIEVEMENTS));
    }

    try {
      if (typeof localStorage !== 'undefined') {
        const local = localStorage.getItem('achievements_data');
        if (local) {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed) && parsed.length > 0) {
            data = parsed;
          }
        }
      }
    } catch (e) { }

    this.achievements = data;
  }

  async checkRemoteUpdates() {
    if (typeof window === 'undefined') return;
    if (window.location.protocol !== 'http:' && window.location.protocol !== 'https:') return;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const res = await fetch('/api/achievements', { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          this.achievements = json.data;
          try {
            localStorage.setItem('achievements_data', JSON.stringify(this.achievements));
          } catch (e) { }

          const currentIdx = this.currentSlideIndex;
          this.buildSlidesManifest();
          this.renderSlides();
          this.renderAppleDots();
          this.goToSlide(Math.min(currentIdx, this.slidesData.length - 1));
        }
      }
    } catch (e) { }
  }

  buildSlidesManifest() {
    const slides = [
      { type: 'cover', id: 'slide-cover' },
      { type: 'stats', id: 'slide-stats' }
    ];

    // One slide PER achievement
    this.achievements.forEach((item, idx) => {
      slides.push({
        type: 'achievement',
        id: `slide-ach-${item.id || idx}`,
        data: item
      });
    });

    // Timeline and Closing slides
    slides.push({ type: 'timeline', id: 'slide-timeline' });
    slides.push({ type: 'closing', id: 'slide-closing' });

    this.slidesData = slides;
  }

  renderAppleDots() {
    const track = document.getElementById('apple-dots-track');
    if (!track) return;

    track.innerHTML = this.slidesData.map((_, idx) => `
      <div class="apple-dot ${idx === this.currentSlideIndex ? 'active' : ''}" data-index="${idx}" role="tab" aria-selected="${idx === this.currentSlideIndex}">
        ${idx === this.currentSlideIndex ? '<div class="apple-dot-fill" id="apple-dot-fill"></div>' : ''}
      </div>
    `).join('');
  }

  renderSlides() {
    const stage = document.getElementById('keynote-stage');
    if (!stage) return;

    stage.innerHTML = this.slidesData.map((slide, idx) => {
      if (slide.type === 'cover') return this.renderCoverSlideHtml(idx);
      if (slide.type === 'stats') return this.renderStatsSlideHtml(idx);
      if (slide.type === 'achievement') return this.renderAchievementSlideHtml(slide.data, idx);
      if (slide.type === 'timeline') return this.renderTimelineSlideHtml(idx);
      if (slide.type === 'closing') return this.renderClosingSlideHtml(idx);
      return '';
    }).join('');
  }

  renderCoverSlideHtml(idx) {
    const words = ["Hall", "of", "Fame."];
    const wordHtml = words.map((w, i) => `<span class="word-span" style="transition-delay: ${0.2 + i * 0.2}s">${w}</span>`).join(' ');

    return `
      <section class="keynote-slide ${idx === this.currentSlideIndex ? 'active' : ''}" id="slide-cover" data-index="${idx}">
        <div class="cover-container">
          <div class="cover-tag reveal-item delay-1">Innovation &amp; Entrepreneurship Development Centre • IEM Kolkata</div>
          <h1 class="cover-title">${wordHtml}</h1>
          <p class="cover-subtitle reveal-item delay-4">
            IEDC CSE (AI &amp; ML) / CSE (AI) · National hackathon championships, premier innovation honors, and competitive benchmarks (2023 – 2026).
          </p>
        </div>
      </section>
    `;
  }

  renderStatsSlideHtml(idx) {
    const totalCount = this.achievements.length;
    const winsCount = this.achievements.filter(a => a.awardTier === 'winner').length;
    const podiumsCount = this.achievements.filter(a => a.awardTier === 'winner' || a.awardTier === 'runner-up' || a.awardTier === 'third-place').length;
    const flagshipsCount = this.achievements.filter(a => a.awardTier === 'finalist' || (a.category && a.category.includes('Flagship')) || (a.tags && a.tags.includes('SIH'))).length || 4;

    return `
      <section class="keynote-slide ${idx === this.currentSlideIndex ? 'active' : ''}" id="slide-stats" data-index="${idx}">
        <div class="stats-container">
          <div class="stats-header reveal-item delay-1">Institutional Track Record · 2023 – 2026</div>
          <div class="stats-grid">
            <div class="stat-card reveal-item delay-2">
              <div class="stat-card-glow"></div>
              <div class="stat-number" data-count="${totalCount}">0</div>
              <div class="stat-label">Recognitions</div>
            </div>
            <div class="stat-card reveal-item delay-3">
              <div class="stat-card-glow"></div>
              <div class="stat-number" data-count="${winsCount}">0</div>
              <div class="stat-label">Championships</div>
            </div>
            <div class="stat-card reveal-item delay-4">
              <div class="stat-card-glow"></div>
              <div class="stat-number" data-count="${podiumsCount}">0</div>
              <div class="stat-label">Podium Finishes</div>
            </div>
            <div class="stat-card reveal-item delay-5">
              <div class="stat-card-glow"></div>
              <div class="stat-number" data-count="${flagshipsCount}">0</div>
              <div class="stat-label">National Flagships</div>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  renderAchievementSlideHtml(item, idx) {
    const rankMap = {
      'winner': { rank: '1st', cls: 'rank-gold', badge: item.badge || 'Grand Champion' },
      'runner-up': { rank: '2nd', cls: 'rank-silver', badge: item.badge || 'Runner Up' },
      'third-place': { rank: '3rd', cls: 'rank-bronze', badge: item.badge || '3rd Podium' },
      'finalist': { rank: 'Finalist', cls: 'rank-finalist', badge: item.badge || 'National Finalist' },
      'special': { rank: 'Special', cls: 'rank-special', badge: item.badge || 'Special Track' }
    };

    const info = rankMap[item.awardTier] || { rank: 'Award', cls: 'rank-crimson', badge: item.badge || 'Recognition' };
    const tags = Array.isArray(item.tags) ? item.tags : [];

    return `
      <section class="keynote-slide ${idx === this.currentSlideIndex ? 'active' : ''}" id="slide-ach-${item.id}" data-index="${idx}" data-tier="${item.awardTier || 'winner'}">
        <div class="faint-year-numeral">${item.year}</div>

        <div class="ach-slide-layout">
          <!-- Rank Block -->
          <div class="ach-rank-block reveal-item delay-1">
            <div class="ach-rank-text ${info.cls}">${info.rank}</div>
            <div class="ach-badge-tag">${info.badge}</div>
          </div>

          <!-- Content Block -->
          <div class="ach-content-block">
            <h2 class="ach-headline reveal-item delay-2">${item.title}</h2>
            ${item.organization ? `<div class="ach-org-line reveal-item delay-3">${item.organization} ${item.category ? `· ${item.category}` : ''}</div>` : ''}
            ${item.description ? `<p class="ach-desc reveal-item delay-4">${item.description}</p>` : ''}
            
            ${tags.length > 0 ? `
              <div class="ach-tags-row reveal-item delay-5">
                ${tags.map(t => `<span class="ach-tag-pill">#${t}</span>`).join('')}
              </div>
            ` : ''}
          </div>
        </div>
      </section>
    `;
  }

  renderTimelineSlideHtml(idx) {
    const years = [2023, 2024, 2025, 2026];
    const counts = years.map(y => this.achievements.filter(a => parseInt(a.year, 10) === y).length);

    return `
      <section class="keynote-slide ${idx === this.currentSlideIndex ? 'active' : ''}" id="slide-timeline" data-index="${idx}">
        <div class="timeline-container">
          <div class="timeline-title reveal-item delay-1">Evolution of Excellence</div>
          
          <div class="timeline-track-wrap reveal-item delay-2">
            <svg class="timeline-svg-line" viewBox="0 0 1000 10" preserveAspectRatio="none">
              <path d="M0 5 L1000 5" />
              <path class="active-line" d="M0 5 L1000 5" />
            </svg>
          </div>

          <div class="timeline-years-grid">
            ${years.map((yr, i) => `
              <div class="timeline-year-node ${i === 3 ? 'active' : ''} reveal-item delay-${i + 2}">
                <div class="timeline-year-num">${yr}</div>
                <div class="timeline-year-count">${counts[i]} Major Honors</div>
              </div>
            `).join('')}
          </div>
        </div>
      </section>
    `;
  }

  renderClosingSlideHtml(idx) {
    return `
      <section class="keynote-slide ${idx === this.currentSlideIndex ? 'active' : ''}" id="slide-closing" data-index="${idx}">
        <div class="closing-container">
          <div class="closing-logos-lockup reveal-item delay-1">
            <img src="assets/iem_logo.png" alt="IEM Logo" class="closing-logo">
            <img src="assets/iedc_logo.png" alt="IEDC Logo" class="closing-logo" style="border-radius: 50%;">
            <img src="assets/uem_logo.png" alt="UEM Logo" class="closing-logo">
          </div>
          
          <h2 class="closing-headline reveal-item delay-2">Hall of Fame</h2>
          <p class="closing-subtext reveal-item delay-3">
            IEDC CSE (AI &amp; ML) / CSE (AI) · Institute of Engineering &amp; Management, Kolkata
          </p>
        </div>
      </section>
    `;
  }

  updateAmbientMeshTint(tier) {
    const mesh = document.getElementById('mesh-background');
    if (!mesh) return;

    const tints = {
      'winner': ['rgba(255, 179, 0, 0.22)', 'rgba(255, 143, 0, 0.16)', 'rgba(255, 213, 79, 0.1)'],
      'runner-up': ['rgba(176, 190, 197, 0.22)', 'rgba(120, 144, 156, 0.16)', 'rgba(207, 216, 220, 0.1)'],
      'third-place': ['rgba(251, 140, 0, 0.22)', 'rgba(230, 81, 0, 0.16)', 'rgba(255, 183, 77, 0.1)'],
      'finalist': ['rgba(102, 187, 106, 0.20)', 'rgba(46, 125, 50, 0.14)', 'rgba(165, 214, 167, 0.1)'],
      'special': ['rgba(171, 71, 188, 0.22)', 'rgba(123, 31, 162, 0.16)', 'rgba(225, 190, 231, 0.1)'],
      'cover': ['rgba(239, 68, 68, 0.22)', 'rgba(185, 28, 28, 0.16)', 'rgba(120, 113, 108, 0.1)'],
      'closing': ['rgba(239, 68, 68, 0.18)', 'rgba(185, 28, 28, 0.12)', 'rgba(120, 113, 108, 0.08)']
    };

    const colors = tints[tier] || tints['cover'];
    mesh.style.setProperty('--mesh-color-1', colors[0]);
    mesh.style.setProperty('--mesh-color-2', colors[1]);
    mesh.style.setProperty('--mesh-color-3', colors[2]);
  }

  animateStatsCounter(slideEl) {
    if (!slideEl) return;
    const nums = slideEl.querySelectorAll('.stat-number');
    nums.forEach(num => {
      const target = parseInt(num.getAttribute('data-count'), 10) || 0;
      const duration = 2000;
      const startTime = performance.now();

      const updateCount = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        // easeOutExpo formula
        const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        const current = Math.floor(easeProgress * target);
        num.textContent = current;

        if (progress < 1) {
          requestAnimationFrame(updateCount);
        } else {
          num.textContent = target;
        }
      };

      requestAnimationFrame(updateCount);
    });
  }

  goToSlide(index) {
    if (index < 0 || index >= this.slidesData.length) return;

    const slides = document.querySelectorAll('.keynote-slide');
    const prevIndex = this.currentSlideIndex;
    const prevSlide = slides[prevIndex];
    const nextSlide = slides[index];

    if (prevSlide && prevIndex !== index) {
      prevSlide.classList.remove('active');
      prevSlide.classList.add('slide-outgoing');
      setTimeout(() => {
        prevSlide.classList.remove('slide-outgoing');
      }, 1000);
    }

    this.currentSlideIndex = index;

    if (nextSlide) {
      nextSlide.classList.remove('slide-outgoing');
      nextSlide.classList.add('active');

      const slideData = this.slidesData[index];
      const tier = slideData.type === 'achievement' ? slideData.data.awardTier : slideData.type;
      this.updateAmbientMeshTint(tier);

      // Trigger stats counter if stats slide
      if (slideData.type === 'stats') {
        this.animateStatsCounter(nextSlide);
      }

      // Trigger sparkles burst if Grand Champion slide
      if (slideData.type === 'achievement' && slideData.data.awardTier === 'winner' && this.sparkles) {
        setTimeout(() => this.sparkles.triggerBurst(), 400);
      }
    }

    this.renderAppleDots();
    this.progressElapsed = 0;
    this.updateProgressBar();
  }

  nextSlide() {
    const nextIdx = (this.currentSlideIndex + 1) % this.slidesData.length;
    this.goToSlide(nextIdx);
  }

  prevSlide() {
    const prevIdx = (this.currentSlideIndex - 1 + this.slidesData.length) % this.slidesData.length;
    this.goToSlide(prevIdx);
  }

  startAutoplay() {
    const tickInterval = 50;
    this.progressElapsed = 0;

    clearInterval(this.progressInterval);
    this.progressInterval = setInterval(() => {
      if (this.isPaused) return;

      this.progressElapsed += tickInterval;
      this.updateProgressBar();

      if (this.progressElapsed >= this.slideDuration) {
        this.progressElapsed = 0;
        this.nextSlide();
      }
    }, tickInterval);
  }

  updateProgressBar() {
    const fill = document.getElementById('apple-dot-fill');
    if (!fill) return;
    const pct = Math.min(100, (this.progressElapsed / this.slideDuration) * 100);
    fill.style.width = `${pct}%`;
  }

  startClock() {
    const clockEl = document.getElementById('apple-clock');
    if (!clockEl) return;

    const update = () => {
      const now = new Date();
      clockEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    update();
    setInterval(update, 1000);
  }

  setupBurnInProtection() {
    // Every 3 minutes, subtly shift burn-in wrapper by 1-2px
    const wrapper = document.getElementById('burn-in-wrapper');
    if (!wrapper) return;

    setInterval(() => {
      const shiftX = (Math.random() * 4 - 2).toFixed(1);
      const shiftY = (Math.random() * 4 - 2).toFixed(1);
      wrapper.style.transform = `translate(${shiftX}px, ${shiftY}px)`;
    }, 180000);
  }

  bindControls() {
    // Hover over stage to pause timer
    const stage = document.getElementById('keynote-stage');
    if (stage) {
      stage.addEventListener('mouseenter', () => { this.isPaused = true; });
      stage.addEventListener('mouseleave', () => { this.isPaused = false; });
    }

    // Keyboard navigation
    window.addEventListener('keydown', (e) => {
      switch (e.key) {
        case 'ArrowRight':
        case 'PageDown':
          this.nextSlide();
          break;
        case 'ArrowLeft':
        case 'PageUp':
          this.prevSlide();
          break;
        case ' ':
          this.isPaused = !this.isPaused;
          break;
        case 'f':
        case 'F':
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
          } else {
            document.exitFullscreen().catch(() => {});
          }
          break;
        case 'm':
        case 'M':
          window.location.href = 'admin.html';
          break;
      }
    });

    // Auto-hide cursor and show admin hotspot on mouse movement
    window.addEventListener('mousemove', () => {
      document.body.classList.remove('hide-cursor');
      document.body.classList.add('show-controls');

      clearTimeout(this.mouseTimer);
      this.mouseTimer = setTimeout(() => {
        document.body.classList.add('hide-cursor');
        document.body.classList.remove('show-controls');
      }, 2500);
    });

    // Click on dots to jump directly
    const track = document.getElementById('apple-dots-track');
    if (track) {
      track.addEventListener('click', (e) => {
        const dot = e.target.closest('.apple-dot');
        if (dot) {
          const idx = parseInt(dot.getAttribute('data-index'), 10);
          this.goToSlide(idx);
        }
      });
    }
  }
}

// Immediate and robust launcher
function launchKeynotePresentation() {
  if (!window.keynoteEngine) {
    window.keynoteEngine = new KeynoteDisplayEngine();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', launchKeynotePresentation);
} else {
  launchKeynotePresentation();
}
