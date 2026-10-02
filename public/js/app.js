// =====================================================================
// SLIDING WINDOW / PPT DECK PRESENTATION CONTROLLER
// =====================================================================

class PresentationApp {
  constructor() {
    this.achievements = [];
    this.currentSlideIndex = 0;
    this.totalSlides = 0;
    this.slidesData = []; // [{ type: 'hero' }, { type: 'year', year: 2023 }, ..., { type: 'showcase' }]
    this.autoplayInterval = null;
    this.autoplaySpeed = 6000; // 6 seconds per slide
    this.isAutoplay = false;
    this.viewMode = 'deck'; // 'deck' or 'grid'

    // Touch gesture tracking
    this.touchStartX = 0;
    this.touchEndX = 0;

    this.init();
  }

  async init() {
    await this.loadAchievements();
    this.adminManager = new AdminManager(this);
    this.bindEvents();
    this.renderSlides();
    this.updateSoundIcon();

    // Check URL hash for direct slide navigation (e.g. #2024 or #slide-2)
    this.handleUrlHash();
  }

  async loadAchievements() {
    try {
      const res = await fetch('/api/achievements');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          this.achievements = json.data;
          this.saveLocalBackup();
          return;
        }
      }
    } catch (e) {
      console.warn('API fetch failed or offline, loading from local storage/fallback');
    }

    // Try localStorage backup
    const local = localStorage.getItem('achievements_data');
    if (local) {
      try {
        this.achievements = JSON.parse(local);
        return;
      } catch (err) {}
    }

    // Use bundled INITIAL_ACHIEVEMENTS from data.js
    if (typeof INITIAL_ACHIEVEMENTS !== 'undefined') {
      this.achievements = JSON.parse(JSON.stringify(INITIAL_ACHIEVEMENTS));
    }
  }

  saveLocalBackup() {
    try {
      localStorage.setItem('achievements_data', JSON.stringify(this.achievements));
    } catch (e) {}
  }

  getAvailableYears() {
    const years = [...new Set(this.achievements.map(a => parseInt(a.year, 10)).filter(y => !isNaN(y)))];
    return years.sort((a, b) => a - b);
  }

  getCurrentSlideYear() {
    const slide = this.slidesData[this.currentSlideIndex];
    return slide && slide.type === 'year' ? slide.year : null;
  }

  buildSlidesManifest() {
    const years = this.getAvailableYears();
    const manifest = [
      { type: 'hero', id: 'slide-hero', title: 'Overview' }
    ];

    years.forEach(year => {
      manifest.push({
        type: 'year',
        year: year,
        id: `slide-year-${year}`,
        title: `${year}`
      });
    });

    manifest.push({
      type: 'showcase',
      id: 'slide-showcase',
      title: 'Hall of Fame'
    });

    this.slidesData = manifest;
    this.totalSlides = manifest.length;
  }

  renderSlides() {
    this.buildSlidesManifest();
    this.renderHeaderNav();
    this.renderDeckSlides();
    this.renderGridView();
    this.updateSlidePosition(false);
  }

  renderHeaderNav() {
    const nav = document.getElementById('header-year-nav');
    if (!nav) return;

    nav.innerHTML = this.slidesData.map((s, idx) => {
      let count = '';
      if (s.type === 'year') {
        const countNum = this.achievements.filter(a => parseInt(a.year, 10) === s.year).length;
        count = `<span class="pill-count">${countNum}</span>`;
      }
      return `
        <button class="year-pill ${idx === this.currentSlideIndex ? 'active' : ''}" data-index="${idx}">
          ${s.type === 'hero' ? '🏠 Cover' : (s.type === 'showcase' ? '🏆 Summary' : s.year)}
          ${count}
        </button>
      `;
    }).join('');

    nav.querySelectorAll('.year-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-index'), 10);
        sound.playClick();
        this.goToSlide(idx);
      });
    });
  }

  renderDeckSlides() {
    const wrapper = document.getElementById('slides-wrapper');
    if (!wrapper) return;

    wrapper.innerHTML = this.slidesData.map((s, idx) => {
      if (s.type === 'hero') {
        return this.generateHeroSlideHtml(idx);
      } else if (s.type === 'year') {
        return this.generateYearSlideHtml(s.year, idx);
      } else if (s.type === 'showcase') {
        return this.generateShowcaseSlideHtml(idx);
      }
      return '';
    }).join('');

    this.attachCardEventListeners();
  }

  generateHeroSlideHtml(idx) {
    const totalWins = this.achievements.filter(a => a.awardTier === 'winner').length;
    const totalRunners = this.achievements.filter(a => a.awardTier === 'runner-up').length;
    const totalThirds = this.achievements.filter(a => a.awardTier === 'third-place').length;
    const totalFinalists = this.achievements.filter(a => a.awardTier === 'finalist' || a.awardTier === 'special').length;
    const totalAll = this.achievements.length;

    return `
      <section class="slide hero-slide ${idx === this.currentSlideIndex ? 'active' : ''}" id="slide-hero" data-index="${idx}">
        <div class="hero-pill-badge">
          <span>✨ COMPETITIVE EXCELLENCE PORTFOLIO</span>
        </div>
        <h1 class="hero-title">Achievements & Milestones Showcase</h1>
        <p class="hero-subtitle">
          An interactive, year-by-year chronicle of hackathon championships, innovation expos, and competitive distinctions (2023 - 2026).
        </p>

        <div class="hero-stats-strip">
          <div class="hero-stat-card">
            <div class="stat-number stat-gold">${totalWins}</div>
            <div class="stat-label">1st / Grand Champions</div>
          </div>
          <div class="hero-stat-card">
            <div class="stat-number stat-silver">${totalRunners}</div>
            <div class="stat-label">2nd Place / Runners-Up</div>
          </div>
          <div class="hero-stat-card">
            <div class="stat-number stat-bronze">${totalThirds}</div>
            <div class="stat-label">3rd Place / Podiums</div>
          </div>
          <div class="hero-stat-card">
            <div class="stat-number stat-cyan">${totalAll}</div>
            <div class="stat-label">Total Recognitions</div>
          </div>
        </div>

        <div class="hero-actions">
          <button class="btn-primary" id="btn-start-presentation">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
            <span>Start Presentation</span>
          </button>
          <button class="btn-secondary" id="btn-jump-latest">
            <span>🔥 Jump to 2026</span>
          </button>
          <button class="btn-secondary" id="btn-toggle-grid-mode">
            <span>📊 All Years Grid</span>
          </button>
        </div>

        <div class="keyboard-hints-pill">
          <span>Navigate with <kbd>→</kbd> <kbd>←</kbd> or <kbd>Space</kbd></span>
          <span>•</span>
          <span><kbd>F</kbd> Fullscreen</span>
          <span>•</span>
          <span><kbd>A</kbd> Autoplay</span>
        </div>
      </section>
    `;
  }

  generateYearSlideHtml(year, idx) {
    const items = this.achievements.filter(a => parseInt(a.year, 10) === year);
    const winCount = items.filter(a => a.awardTier === 'winner').length;
    const podiumCount = items.length;

    const yearThemes = {
      2023: { motto: "The Inception & National Glory", desc: "Setting the benchmark with national flagship hackathon titles." },
      2024: { motto: "Momentum & High-Impact Breakthroughs", desc: "Dominating space tech, technical symposiums, and innovation meets." },
      2025: { motto: "Multi-Domain Dominance", desc: "Best AI hacks, business plans at IIT Kharagpur, and regional championships." },
      2026: { motto: "Championship Pinnacle", desc: "IIT-BHU Expo champion, Colloquium 1st prize, and Binary V2 triple sweep." }
    };

    const theme = yearThemes[year] || { motto: `Year ${year} Achievements`, desc: `Record of honors and competitive distinctions in ${year}.` };

    return `
      <section class="slide ${idx === this.currentSlideIndex ? 'active' : ''}" id="slide-year-${year}" data-index="${idx}">
        <div class="slide-header">
          <div class="slide-title-wrap">
            <div class="slide-year-badge">${year}</div>
            <div class="slide-headline">
              <h2>${theme.motto}</h2>
              <p>${theme.desc}</p>
            </div>
          </div>
          <div class="slide-metrics">
            <div class="metric-chip">
              <span>Total Honors:</span>
              <strong>${podiumCount}</strong>
            </div>
            <div class="metric-chip">
              <span>Champions / 1st:</span>
              <strong style="color: #fbbf24;">${winCount} 🏆</strong>
            </div>
          </div>
        </div>

        <div class="achievements-grid">
          ${items.map(item => this.generateCardHtml(item)).join('')}
        </div>
      </section>
    `;
  }

  generateShowcaseSlideHtml(idx) {
    const totalAll = this.achievements.length;
    const winners = this.achievements.filter(a => a.awardTier === 'winner');
    const runners = this.achievements.filter(a => a.awardTier === 'runner-up');
    const thirds = this.achievements.filter(a => a.awardTier === 'third-place');
    const finalists = this.achievements.filter(a => a.awardTier === 'finalist');
    const specials = this.achievements.filter(a => a.awardTier === 'special');

    return `
      <section class="slide ${idx === this.currentSlideIndex ? 'active' : ''}" id="slide-showcase" data-index="${idx}">
        <div class="slide-header">
          <div class="slide-title-wrap">
            <div class="slide-year-badge" style="background: linear-gradient(135deg, #ec4899, #8b5cf6, #3b82f6); -webkit-background-clip: text;">ALL-TIME</div>
            <div class="slide-headline">
              <h2>Hall of Fame & Executive Summary</h2>
              <p>Aggregate performance metrics and podium analytics across 2023 - 2026.</p>
            </div>
          </div>
          <div class="slide-metrics">
            <div class="metric-chip">
              <span>Grand Tally:</span>
              <strong>${totalAll} Wins & Podiums</strong>
            </div>
          </div>
        </div>

        <div class="showcase-grid">
          <div class="showcase-panel">
            <h3>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2">
                <circle cx="12" cy="8" r="7"></circle>
                <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
              </svg>
              <span>Award Tier Breakdown</span>
            </h3>

            <div class="tier-bar-list">
              <div class="tier-bar-item">
                <div class="tier-bar-meta">
                  <span style="color: #fbbf24;">🏆 1st Place / Champions (${winners.length})</span>
                  <span>${Math.round((winners.length / totalAll) * 100)}%</span>
                </div>
                <div class="tier-progress-track">
                  <div class="tier-progress-fill" style="width: ${(winners.length / totalAll) * 100}%; background: linear-gradient(90deg, #f59e0b, #fbbf24);"></div>
                </div>
              </div>

              <div class="tier-bar-item">
                <div class="tier-bar-meta">
                  <span style="color: #e2e8f0;">🥈 2nd Place / Runners-Up (${runners.length})</span>
                  <span>${Math.round((runners.length / totalAll) * 100)}%</span>
                </div>
                <div class="tier-progress-track">
                  <div class="tier-progress-fill" style="width: ${(runners.length / totalAll) * 100}%; background: linear-gradient(90deg, #94a3b8, #cbd5e1);"></div>
                </div>
              </div>

              <div class="tier-bar-item">
                <div class="tier-bar-meta">
                  <span style="color: #fb923c;">🥉 3rd Place / 2nd Runners-Up (${thirds.length})</span>
                  <span>${Math.round((thirds.length / totalAll) * 100)}%</span>
                </div>
                <div class="tier-progress-track">
                  <div class="tier-progress-fill" style="width: ${(thirds.length / totalAll) * 100}%; background: linear-gradient(90deg, #ea580c, #fb923c);"></div>
                </div>
              </div>

              <div class="tier-bar-item">
                <div class="tier-bar-meta">
                  <span style="color: #38bdf8;">🎖️ National Finalists (${finalists.length})</span>
                  <span>${Math.round((finalists.length / totalAll) * 100)}%</span>
                </div>
                <div class="tier-progress-track">
                  <div class="tier-progress-fill" style="width: ${(finalists.length / totalAll) * 100}%; background: linear-gradient(90deg, #0284c7, #38bdf8);"></div>
                </div>
              </div>

              <div class="tier-bar-item">
                <div class="tier-bar-meta">
                  <span style="color: #c084fc;">🌟 Bounty & Special Track Wins (${specials.length})</span>
                  <span>${Math.round((specials.length / totalAll) * 100)}%</span>
                </div>
                <div class="tier-progress-track">
                  <div class="tier-progress-fill" style="width: ${(specials.length / totalAll) * 100}%; background: linear-gradient(90deg, #9333ea, #c084fc);"></div>
                </div>
              </div>
            </div>
          </div>

          <div class="showcase-panel">
            <h3>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
              <span>Featured Key Highlights</span>
            </h3>

            <div style="display: flex; flex-direction: column; gap: 10px; overflow-y: auto;">
              <div style="background: rgba(255,255,255,0.04); padding: 12px; border-radius: var(--radius-md); border-left: 3px solid #fbbf24;">
                <div style="font-weight: 700; font-size: 0.95rem; color: #fff;">🏆 SIH Winner (Smart India Hackathon)</div>
                <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">Crowned Winner at India's biggest national hackathon & 3x consecutive finalist selection.</div>
              </div>
              <div style="background: rgba(255,255,255,0.04); padding: 12px; border-radius: var(--radius-md); border-left: 3px solid #fbbf24;">
                <div style="font-weight: 700; font-size: 0.95rem; color: #fff;">🚀 ISRO Space Hackathon Winner</div>
                <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">Secured 1st Place solving aerospace and satellite data problem statements.</div>
              </div>
              <div style="background: rgba(255,255,255,0.04); padding: 12px; border-radius: var(--radius-md); border-left: 3px solid #fbbf24;">
                <div style="font-weight: 700; font-size: 0.95rem; color: #fff;">🏛️ IIT-BHU Innovation Expo & IIT Kharagpur B-Plan</div>
                <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">Championship and podium finishes at premier Indian Institutes of Technology.</div>
              </div>
              <div style="background: rgba(255,255,255,0.04); padding: 12px; border-radius: var(--radius-md); border-left: 3px solid #c084fc;">
                <div style="font-weight: 700; font-size: 0.95rem; color: #fff;">⚡ Binary V2 Triple Crown (2026)</div>
                <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">2nd Runner Up Overall, Algorand Bounty Winner, and Open Innovation Track Winner.</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  generateCardHtml(item) {
    const tierClasses = {
      'winner': 'tier-winner',
      'runner-up': 'tier-runner-up',
      'third-place': 'tier-third-place',
      'finalist': 'tier-finalist',
      'special': 'tier-special'
    };

    const badgeClasses = {
      'winner': 'badge-gold',
      'runner-up': 'badge-silver',
      'third-place': 'badge-bronze',
      'finalist': 'badge-finalist',
      'special': 'badge-special'
    };

    const tierClass = tierClasses[item.awardTier] || 'tier-winner';
    const badgeClass = badgeClasses[item.awardTier] || 'badge-gold';

    const tags = Array.isArray(item.tags) ? item.tags : [];

    return `
      <article class="achievement-card ${tierClass}" data-id="${item.id}">
        <div>
          <div class="card-top">
            <div class="card-badge ${badgeClass}">
              ${item.badge || item.position || 'Award'}
            </div>
            <div class="card-category">${item.category || ''}</div>
          </div>

          <h3 class="card-title">${item.title}</h3>

          ${item.organization ? `
            <div class="card-org">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"></path>
              </svg>
              <span>${item.organization}</span>
            </div>
          ` : ''}

          ${item.description ? `
            <p class="card-desc">${item.description}</p>
          ` : ''}
        </div>

        <div class="card-footer">
          <div class="card-tags">
            ${tags.slice(0, 3).map(tag => `<span class="tag-pill">#${tag}</span>`).join('')}
          </div>

          <div class="card-admin-actions">
            <button class="btn-card-action btn-edit" title="Edit Achievement" data-id="${item.id}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              </svg>
            </button>
            <button class="btn-card-action btn-del" title="Delete Achievement" data-id="${item.id}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>
      </article>
    `;
  }

  attachCardEventListeners() {
    // Hero buttons
    const startBtn = document.getElementById('btn-start-presentation');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        sound.playClick();
        this.goToSlide(1);
      });
    }

    const jump2026Btn = document.getElementById('btn-jump-latest');
    if (jump2026Btn) {
      jump2026Btn.addEventListener('click', () => {
        sound.playClick();
        this.goToYearSlide(2026);
      });
    }

    const gridBtn = document.getElementById('btn-toggle-grid-mode');
    if (gridBtn) {
      gridBtn.addEventListener('click', () => {
        sound.playClick();
        this.toggleViewMode();
      });
    }

    // Card admin actions
    document.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const item = this.achievements.find(a => a.id === id);
        if (item) {
          sound.playClick();
          this.adminManager.openEditModal(item);
        }
      });
    });

    document.querySelectorAll('.btn-del').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const item = this.achievements.find(a => a.id === id);
        if (item) {
          sound.playClick();
          this.adminManager.confirmDelete(id, item.title);
        }
      });
    });
  }

  renderGridView() {
    const gridContainer = document.getElementById('grid-viewport');
    if (!gridContainer) return;

    const years = this.getAvailableYears().reverse(); // newest first in grid view

    gridContainer.innerHTML = years.map(year => {
      const items = this.achievements.filter(a => parseInt(a.year, 10) === year);
      return `
        <div class="grid-year-section">
          <div class="grid-year-header">
            <span class="grid-year-title">${year}</span>
            <span class="metric-chip"><strong>${items.length}</strong> Achievements</span>
          </div>
          <div class="achievements-grid">
            ${items.map(item => this.generateCardHtml(item)).join('')}
          </div>
        </div>
      `;
    }).join('');

    this.attachCardEventListeners();
  }

  goToSlide(index) {
    if (index < 0 || index >= this.totalSlides) return;
    this.currentSlideIndex = index;
    this.updateSlidePosition(true);
    sound.playSwoosh();

    // Trigger confetti on 2026 or Hall of Fame slide
    const slide = this.slidesData[this.currentSlideIndex];
    if (slide && (slide.year === 2026 || slide.type === 'showcase')) {
      triggerConfetti(0.5, 0.4);
    }
  }

  goToYearSlide(year) {
    const idx = this.slidesData.findIndex(s => s.type === 'year' && parseInt(s.year, 10) === parseInt(year, 10));
    if (idx !== -1) {
      this.goToSlide(idx);
    }
  }

  nextSlide() {
    if (this.currentSlideIndex < this.totalSlides - 1) {
      this.goToSlide(this.currentSlideIndex + 1);
    } else if (this.isAutoplay) {
      this.goToSlide(0); // loop
    }
  }

  prevSlide() {
    if (this.currentSlideIndex > 0) {
      this.goToSlide(this.currentSlideIndex - 1);
    }
  }

  updateSlidePosition(playEffect = true) {
    const slides = document.querySelectorAll('.deck-viewport .slide');
    slides.forEach((slide, idx) => {
      slide.classList.remove('active', 'prev-slide');
      if (idx === this.currentSlideIndex) {
        slide.classList.add('active');
      } else if (idx < this.currentSlideIndex) {
        slide.classList.add('prev-slide');
      }
    });

    // Update Counter
    const counterEl = document.getElementById('deck-slide-counter');
    if (counterEl) {
      const currentNum = String(this.currentSlideIndex + 1).padStart(2, '0');
      const totalNum = String(this.totalSlides).padStart(2, '0');
      counterEl.innerHTML = `<strong>${currentNum}</strong> / ${totalNum}`;
    }

    // Update Top Progress Bar
    const progressFill = document.getElementById('top-deck-progress-fill');
    if (progressFill && this.totalSlides > 0) {
      const pct = (this.currentSlideIndex / (this.totalSlides - 1)) * 100;
      progressFill.style.width = `${pct}%`;
    }

    // Update Header Pill
    const pills = document.querySelectorAll('.header-center-nav .year-pill');
    pills.forEach((pill, idx) => {
      if (idx === this.currentSlideIndex) {
        pill.classList.add('active');
      } else {
        pill.classList.remove('active');
      }
    });

    // Update Prev/Next buttons disabled state
    const prevBtn = document.getElementById('btn-deck-prev');
    const nextBtn = document.getElementById('btn-deck-next');
    if (prevBtn) prevBtn.disabled = this.currentSlideIndex === 0;
    if (nextBtn) nextBtn.disabled = this.currentSlideIndex === this.totalSlides - 1;

    // Update URL hash
    const slide = this.slidesData[this.currentSlideIndex];
    if (slide) {
      window.location.hash = slide.id;
    }
  }

  toggleAutoplay() {
    this.isAutoplay = !this.isAutoplay;
    const playBtn = document.getElementById('btn-deck-play');

    if (this.isAutoplay) {
      if (playBtn) {
        playBtn.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16"></rect>
            <rect x="14" y="4" width="4" height="16"></rect>
          </svg>
        `;
        playBtn.classList.add('active');
        playBtn.title = "Pause Slideshow";
      }
      this.autoplayInterval = setInterval(() => {
        this.nextSlide();
      }, this.autoplaySpeed);
      this.showToast('Autoplay slideshow started', 'info');
    } else {
      if (playBtn) {
        playBtn.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
        `;
        playBtn.classList.remove('active');
        playBtn.title = "Play Slideshow";
      }
      clearInterval(this.autoplayInterval);
      this.autoplayInterval = null;
      this.showToast('Autoplay paused', 'info');
    }
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      this.showToast('Fullscreen Mode (Press Esc to exit)', 'info');
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  toggleViewMode() {
    const deckViewport = document.getElementById('deck-viewport');
    const gridViewport = document.getElementById('grid-viewport');
    const toggleBtn = document.getElementById('btn-deck-grid');

    if (this.viewMode === 'deck') {
      this.viewMode = 'grid';
      deckViewport.style.display = 'none';
      gridViewport.classList.add('active');
      if (toggleBtn) {
        toggleBtn.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
            <line x1="8" y1="21" x2="16" y2="21"></line>
            <line x1="12" y1="17" x2="12" y2="21"></line>
          </svg>
        `;
        toggleBtn.title = "Switch to PPT Slide Deck";
      }
      this.showToast('Switched to Grid Dashboard View', 'info');
    } else {
      this.viewMode = 'deck';
      deckViewport.style.display = 'block';
      gridViewport.classList.remove('active');
      if (toggleBtn) {
        toggleBtn.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
        `;
        toggleBtn.title = "Switch to All-Years Grid";
      }
      this.updateSlidePosition(false);
      this.showToast('Switched to PPT Presentation Mode', 'info');
    }
  }

  toggleSound() {
    const isEnabled = sound.toggle();
    this.updateSoundIcon();
    if (isEnabled) {
      sound.playClick();
      this.showToast('Audio FX enabled 🔊', 'info');
    } else {
      this.showToast('Audio FX muted 🔇', 'info');
    }
  }

  updateSoundIcon() {
    const soundBtn = document.getElementById('btn-deck-sound');
    if (!soundBtn) return;
    if (sound.enabled) {
      soundBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
        </svg>
      `;
      soundBtn.title = "Mute Sound (S)";
    } else {
      soundBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
          <line x1="23" y1="9" x2="17" y2="15"></line>
          <line x1="17" y1="9" x2="23" y2="15"></line>
        </svg>
      `;
      soundBtn.title = "Enable Sound (S)";
    }
  }

  bindEvents() {
    // Deck Controls
    const prevBtn = document.getElementById('btn-deck-prev');
    const nextBtn = document.getElementById('btn-deck-next');
    const playBtn = document.getElementById('btn-deck-play');
    const fullBtn = document.getElementById('btn-deck-fullscreen');
    const gridBtn = document.getElementById('btn-deck-grid');
    const soundBtn = document.getElementById('btn-deck-sound');

    if (prevBtn) prevBtn.addEventListener('click', () => { sound.playClick(); this.prevSlide(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { sound.playClick(); this.nextSlide(); });
    if (playBtn) playBtn.addEventListener('click', () => { sound.playClick(); this.toggleAutoplay(); });
    if (fullBtn) fullBtn.addEventListener('click', () => { sound.playClick(); this.toggleFullscreen(); });
    if (gridBtn) gridBtn.addEventListener('click', () => { sound.playClick(); this.toggleViewMode(); });
    if (soundBtn) soundBtn.addEventListener('click', () => this.toggleSound());

    // Brand logo returns to cover
    const brand = document.querySelector('.brand-section');
    if (brand) {
      brand.addEventListener('click', () => {
        sound.playClick();
        this.goToSlide(0);
      });
    }

    // Keyboard navigation
    window.addEventListener('keydown', (e) => {
      // Don't intercept if typing in an input/textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
        return;
      }

      switch (e.key) {
        case 'ArrowRight':
        case 'PageDown':
        case ' ':
          e.preventDefault();
          this.nextSlide();
          break;
        case 'ArrowLeft':
        case 'PageUp':
          e.preventDefault();
          this.prevSlide();
          break;
        case 'Home':
          e.preventDefault();
          this.goToSlide(0);
          break;
        case 'End':
          e.preventDefault();
          this.goToSlide(this.totalSlides - 1);
          break;
        case 'f':
        case 'F':
          this.toggleFullscreen();
          break;
        case 'a':
        case 'A':
        case 'p':
        case 'P':
          this.toggleAutoplay();
          break;
        case 'g':
        case 'G':
          this.toggleViewMode();
          break;
        case 's':
        case 'S':
          this.toggleSound();
          break;
        case 'm':
        case 'M':
          if (!this.adminManager.isAuthenticated()) {
            this.adminManager.openLoginModal();
          } else {
            this.adminManager.openSettingsModal();
          }
          break;
      }
    });

    // Touch Swipe Detection on Slide Deck
    const deck = document.getElementById('deck-viewport');
    if (deck) {
      deck.addEventListener('touchstart', (e) => {
        this.touchStartX = e.changedTouches[0].screenX;
      }, { passive: true });

      deck.addEventListener('touchend', (e) => {
        this.touchEndX = e.changedTouches[0].screenX;
        const diff = this.touchStartX - this.touchEndX;
        if (Math.abs(diff) > 50) {
          if (diff > 0) {
            this.nextSlide(); // swipe left -> next
          } else {
            this.prevSlide(); // swipe right -> prev
          }
        }
      }, { passive: true });
    }
  }

  handleUrlHash() {
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      const idx = this.slidesData.findIndex(s => s.id === hash || String(s.year) === hash);
      if (idx !== -1) {
        this.currentSlideIndex = idx;
        this.updateSlidePosition(false);
      }
    }
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span>${type === 'success' ? '✅' : (type === 'error' ? '⚠️' : 'ℹ️')}</span>
      <span>${message}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }
}

// Instantiate on DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
  window.app = new PresentationApp();
});
