// =====================================================================
// ACHIEVEDECK - AMBIENT TV DISPLAY SLIDESHOW ENGINE
// Continuous Autoplay, TV Typography, Zero Touch Required, Instant Render
// =====================================================================

class TVPresentationEngine {
  constructor() {
    this.achievements = [];
    this.currentSlideIndex = 0;
    this.slidesData = [];
    this.slideDuration = 10000; // 10 seconds per slide for TV viewing
    this.isPaused = false;
    this.progressInterval = null;
    this.progressElapsed = 0;

    this.init();
  }

  init() {
    // 1. Immediately load data synchronously to guarantee 0ms render (never blank!)
    this.loadInitialData();

    // 2. Build and render slides right away
    this.buildSlides();
    this.renderSlides();
    this.renderHeaderDots();

    // 3. Start ambient clock, autoplay loop, and input listeners
    this.startClock();
    this.startAutoplay();
    this.bindControls();

    // 4. Asynchronously check for live updates in the background (non-blocking)
    this.checkRemoteUpdates();
  }

  loadInitialData() {
    let data = [];

    // Priority 1: Check bundled data from data.js
    if (typeof INITIAL_ACHIEVEMENTS !== 'undefined' && Array.isArray(INITIAL_ACHIEVEMENTS) && INITIAL_ACHIEVEMENTS.length > 0) {
      data = JSON.parse(JSON.stringify(INITIAL_ACHIEVEMENTS));
    } else if (typeof window !== 'undefined' && Array.isArray(window.INITIAL_ACHIEVEMENTS) && window.INITIAL_ACHIEVEMENTS.length > 0) {
      data = JSON.parse(JSON.stringify(window.INITIAL_ACHIEVEMENTS));
    }

    // Priority 2: Use localStorage ONLY if it contains a non-empty array
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
    } catch (e) {
      console.warn('localStorage read skipped:', e);
    }

    this.achievements = data;
  }

  async checkRemoteUpdates() {
    // Only attempt fetch when served over http/https
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
          } catch (e) {}

          const currentIdx = this.currentSlideIndex;
          this.buildSlides();
          this.renderSlides();
          this.renderHeaderDots();
          this.goToSlide(Math.min(currentIdx, this.slidesData.length - 1));
        }
      }
    } catch (e) {
      // Quiet fallback - offline or local static file
    }
  }

  getYears() {
    const years = [...new Set(this.achievements.map(a => parseInt(a.year, 10)).filter(y => !isNaN(y)))];
    return years.sort((a, b) => a - b);
  }

  buildSlides() {
    const years = this.getYears();
    const slides = [
      { type: 'cover', id: 'slide-cover' }
    ];

    years.forEach(year => {
      slides.push({
        type: 'year',
        year: year,
        id: `slide-year-${year}`
      });
    });

    slides.push({
      type: 'summary',
      id: 'slide-summary'
    });

    this.slidesData = slides;
  }

  renderHeaderDots() {
    const track = document.getElementById('tv-dots-track');
    if (!track) return;

    track.innerHTML = this.slidesData.map((_, idx) => `
      <div class="tv-dot ${idx === this.currentSlideIndex ? 'active' : ''}" data-index="${idx}"></div>
    `).join('');
  }

  renderSlides() {
    const stage = document.getElementById('tv-stage');
    if (!stage) return;

    stage.innerHTML = this.slidesData.map((slide, idx) => {
      if (slide.type === 'cover') {
        return this.renderCoverSlideHtml(idx);
      } else if (slide.type === 'year') {
        return this.renderYearSlideHtml(slide.year, idx);
      } else if (slide.type === 'summary') {
        return this.renderSummarySlideHtml(idx);
      }
      return '';
    }).join('');
  }

  renderCoverSlideHtml(idx) {
    const totalWins = this.achievements.filter(a => a.awardTier === 'winner').length;
    const totalRunners = this.achievements.filter(a => a.awardTier === 'runner-up').length;
    const totalThirds = this.achievements.filter(a => a.awardTier === 'third-place').length;
    const totalCount = this.achievements.length;

    return `
      <section class="tv-slide ${idx === this.currentSlideIndex ? 'active' : ''}" id="slide-cover" data-index="${idx}">
        <div class="tv-cover-slide">
          <div class="tv-cover-tag">Innovation &amp; Entrepreneurship Development Centre • IEM Kolkata</div>
          <h1 class="tv-cover-headline">IEDC CSE (AI &amp; ML) / CSE (AI)</h1>
          <p class="tv-cover-desc">
            Annual competitive achievements, national hackathon championships, and innovation honors (2023 – 2026).
          </p>

          <div class="tv-cover-stats">
            <div class="tv-stat-block">
              <div class="tv-stat-num crimson">${totalCount}</div>
              <div class="tv-stat-lbl">Total Recognitions</div>
            </div>
            <div class="tv-stat-block">
              <div class="tv-stat-num">${totalWins}</div>
              <div class="tv-stat-lbl">1st / Grand Champions</div>
            </div>
            <div class="tv-stat-block">
              <div class="tv-stat-num">${totalRunners}</div>
              <div class="tv-stat-lbl">Runners-Up (2nd)</div>
            </div>
            <div class="tv-stat-block">
              <div class="tv-stat-num">${totalThirds}</div>
              <div class="tv-stat-lbl">3rd Place / Podiums</div>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  renderYearSlideHtml(year, idx) {
    const items = this.achievements.filter(a => parseInt(a.year, 10) === year);
    const winCount = items.filter(a => a.awardTier === 'winner').length;

    const yearDetails = {
      2023: {
        tagline: "The Foundation & National Flagship Title",
        desc: "Setting an unprecedented institutional benchmark with grand victory at the Smart India Hackathon."
      },
      2024: {
        tagline: "High-Impact Multi-Disciplinary Momentum",
        desc: "Sweeping victories across aerospace engineering with ISRO, entrepreneurship, and innovation meets."
      },
      2025: {
        tagline: "Dominance Across AI, B-Plan & Regional Tech",
        desc: "Best AI Hack recognition, IIT Kharagpur podium finish, and community hackathon championships."
      },
      2026: {
        tagline: "Championship Pinnacle & Triple Crown",
        desc: "IIT-BHU Innovation Expo overall winner, Colloquium 1st prize, and Binary V2 triple sweep."
      }
    };

    const details = yearDetails[year] || {
      tagline: `Competitive Record for ${year}`,
      desc: `Major project championships and recognitions achieved in ${year}.`
    };

    const isSingleItem = items.length === 1;
    const gridClass = isSingleItem ? 'grid-1' : 'grid-many';

    return `
      <section class="tv-slide ${idx === this.currentSlideIndex ? 'active' : ''}" id="slide-year-${year}" data-index="${idx}">
        <div class="tv-year-split">
          <!-- Left Column -->
          <div class="tv-year-aside">
            <div>
              <div class="tv-year-num">${year}</div>
              <h2 class="tv-year-tagline">${details.tagline}</h2>
              <p class="tv-year-summary">${details.desc}</p>
            </div>

            <div class="tv-year-meta-box">
              <div class="tv-year-count-pill">
                <span>${items.length}</span> Major Honors in ${year}
              </div>
              <div style="font-size: clamp(0.95rem, 1.15vw, 1.25rem); color: var(--text-muted); margin-top: 4px;">
                ${winCount} 1st Place / Champion Trophies
              </div>
            </div>
          </div>

          <!-- Right Column -->
          <div class="tv-achievements-container">
            <div class="tv-cards-grid ${gridClass}">
              ${items.map(item => this.renderTvCardHtml(item, isSingleItem)).join('')}
            </div>
          </div>
        </div>
      </section>
    `;
  }

  renderTvCardHtml(item, isHero) {
    const badgeTypes = {
      'winner': { cls: 'badge-winner', label: item.badge || 'WINNER' },
      'runner-up': { cls: 'badge-runner', label: item.badge || '2ND PLACE' },
      'third-place': { cls: 'badge-bronze', label: item.badge || '3RD PLACE' },
      'finalist': { cls: 'badge-finalist', label: item.badge || 'FINALIST' },
      'special': { cls: 'badge-track', label: item.badge || 'SPECIAL TRACK' }
    };

    const badge = badgeTypes[item.awardTier] || { cls: 'badge-winner', label: item.badge || 'AWARD' };
    const tierClass = `card-tier-${item.awardTier || 'winner'}`;

    return `
      <article class="tv-card ${isHero ? 'tv-card-hero' : ''} ${tierClass}">
        <div class="tv-card-header">
          <span class="tv-card-badge ${badge.cls}">${badge.label}</span>
          <span class="tv-card-category">${item.category || ''}</span>
        </div>

        <h3 class="tv-card-title">${item.title}</h3>

        <div class="tv-card-meta">
          ${item.organization ? `<strong>${item.organization}</strong>` : ''}
          ${item.description && isHero ? `<p class="tv-card-detail" style="margin-top: 1.2vh; color: var(--text-secondary);">${item.description}</p>` : ''}
        </div>
      </article>
    `;
  }

  renderSummarySlideHtml(idx) {
    const winners = this.achievements.filter(a => a.awardTier === 'winner').length;
    const runners = this.achievements.filter(a => a.awardTier === 'runner-up').length;
    const thirds = this.achievements.filter(a => a.awardTier === 'third-place').length;
    const finalists = this.achievements.filter(a => a.awardTier === 'finalist').length;
    const specials = this.achievements.filter(a => a.awardTier === 'special').length;

    return `
      <section class="tv-slide ${idx === this.currentSlideIndex ? 'active' : ''}" id="slide-summary" data-index="${idx}">
        <div class="tv-summary-split">
          <div class="tv-summary-panel">
            <h2 class="tv-summary-heading">All-Time Cumulative Podiums</h2>
            <div class="tv-summary-list">
              <div class="tv-summary-item">
                <span class="tv-summary-item-label">🏆 1st Prize &amp; Grand Champions</span>
                <span class="tv-summary-item-val">${winners}</span>
              </div>
              <div class="tv-summary-item">
                <span class="tv-summary-item-label">🥈 2nd Place / Runners-Up</span>
                <span class="tv-summary-item-val">${runners}</span>
              </div>
              <div class="tv-summary-item">
                <span class="tv-summary-item-label">🥉 3rd Place / 2nd Runners-Up</span>
                <span class="tv-summary-item-val">${thirds}</span>
              </div>
              <div class="tv-summary-item">
                <span class="tv-summary-item-label">🎖️ National Flagship Finalists</span>
                <span class="tv-summary-item-val">${finalists}</span>
              </div>
              <div class="tv-summary-item">
                <span class="tv-summary-item-label">🌟 Bounty &amp; Special Track Wins</span>
                <span class="tv-summary-item-val">${specials}</span>
              </div>
            </div>
          </div>

          <div class="tv-summary-panel">
            <div class="tv-spotlight-box">
              <div class="tv-spotlight-item">
                <h4>🏛️ Smart India Hackathon (SIH)</h4>
                <p>Crowned Grand Champions in SIH 2023, along with consecutive national finalist selections in SIH 2024 and SIH 2025.</p>
              </div>
              <div class="tv-spotlight-item">
                <h4>🚀 ISRO Space Hackathon</h4>
                <p>1st Place Winner solving critical space technology and satellite problem statements with ISRO.</p>
              </div>
              <div class="tv-spotlight-item">
                <h4>🎓 Premier Institutes (IIT BHU &amp; IIT Kharagpur)</h4>
                <p>Grand Winner at IIT-BHU Innovation Expo 2026 and 2nd Runner-Up in the IIT Kharagpur B-Plan Competition.</p>
              </div>
              <div class="tv-spotlight-item">
                <h4>⚡ Binary V2 Triple Crown</h4>
                <p>Triple distinction in 2026: Overall 2nd Runner-Up, Algorand Bounty Winner, and Open Innovation Track Winner.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  goToSlide(index) {
    if (index < 0 || index >= this.slidesData.length) return;

    const slides = document.querySelectorAll('.tv-slide');
    const dots = document.querySelectorAll('.tv-dot');

    const prevIndex = this.currentSlideIndex;
    const prevSlide = slides[prevIndex];
    const nextSlide = slides[index];

    if (prevSlide && prevIndex !== index) {
      prevSlide.classList.remove('active');
      prevSlide.classList.add('slide-out');
      setTimeout(() => {
        prevSlide.classList.remove('slide-out');
      }, 650);
    }

    this.currentSlideIndex = index;

    if (nextSlide) {
      nextSlide.classList.remove('slide-out');
      nextSlide.classList.add('active');
    }

    dots.forEach((dot, idx) => {
      if (idx === this.currentSlideIndex) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });

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
    const tickInterval = 50; // update progress every 50ms
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
    const bar = document.getElementById('tv-progress-bar');
    if (!bar) return;
    const pct = Math.min(100, (this.progressElapsed / this.slideDuration) * 100);
    bar.style.width = `${pct}%`;
  }

  startClock() {
    const clockEl = document.getElementById('tv-clock');
    if (!clockEl) return;

    const update = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateStr = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
      clockEl.textContent = `${timeStr} • ${dateStr}`;
    };

    update();
    setInterval(update, 1000);
  }

  bindControls() {
    // Keyboard navigation for wireless clicker or TV remote
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

    // Tap/Click on dots to jump directly
    document.querySelectorAll('.tv-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        const idx = parseInt(dot.getAttribute('data-index'), 10);
        this.goToSlide(idx);
      });
    });
  }
}

// Immediate and robust launcher (works even if DOMContentLoaded already fired)
function launchTvPresentation() {
  if (!window.tvEngine) {
    window.tvEngine = new TVPresentationEngine();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', launchTvPresentation);
} else {
  launchTvPresentation();
}
