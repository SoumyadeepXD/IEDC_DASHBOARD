// =====================================================================
// ADMIN PORTAL & DATA MANAGEMENT MODULE
// =====================================================================

class AdminManager {
  constructor(app) {
    this.app = app;
    this.token = sessionStorage.getItem('admin_token') || localStorage.getItem('admin_token') || null;
    this.staticPassword = localStorage.getItem('static_admin_password') || 'admin123';
    this.editingId = null;

    this.initElements();
    this.bindEvents();
    this.checkSession();
  }

  initElements() {
    // Modals
    this.loginModal = document.getElementById('login-modal');
    this.achievementModal = document.getElementById('achievement-modal');
    this.settingsModal = document.getElementById('settings-modal');
    this.confirmModal = document.getElementById('confirm-modal');

    // Forms
    this.loginForm = document.getElementById('login-form');
    this.achievementForm = document.getElementById('achievement-form');
    this.settingsForm = document.getElementById('settings-form');

    // Inputs
    this.passwordInput = document.getElementById('admin-password-input');
    this.rememberCheck = document.getElementById('remember-admin');
    this.loginError = document.getElementById('login-error');

    // Achievement form fields
    this.fieldId = document.getElementById('ach-id');
    this.fieldYear = document.getElementById('ach-year');
    this.fieldTitle = document.getElementById('ach-title');
    this.fieldPosition = document.getElementById('ach-position');
    this.fieldTier = document.getElementById('ach-tier');
    this.fieldCategory = document.getElementById('ach-category');
    this.fieldOrg = document.getElementById('ach-org');
    this.fieldDesc = document.getElementById('ach-desc');
    this.fieldBadge = document.getElementById('ach-badge');
    this.fieldTags = document.getElementById('ach-tags');
    this.fieldFeatured = document.getElementById('ach-featured');
    this.modalActionTitle = document.getElementById('modal-action-title');

    // Buttons
    this.adminLockBtn = document.getElementById('admin-lock-btn');
    this.logoutBtn = document.getElementById('btn-admin-logout');
    this.addBtn = document.getElementById('btn-header-add');
    this.bannerAddBtn = document.getElementById('btn-banner-add');
    this.settingsBtn = document.getElementById('btn-admin-settings');
    this.resetBtn = document.getElementById('btn-reset-data');
    this.exportBtn = document.getElementById('btn-export-json');
    this.importInput = document.getElementById('import-file-input');
  }

  bindEvents() {
    // Admin button click
    this.adminLockBtn.addEventListener('click', () => {
      sound.playClick();
      if (this.isAuthenticated()) {
        this.openSettingsModal();
      } else {
        this.openLoginModal();
      }
    });

    // Login Form Submit
    this.loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleLogin();
    });

    // Password visibility toggle
    const togglePassBtn = document.getElementById('toggle-password-visibility');
    if (togglePassBtn) {
      togglePassBtn.addEventListener('click', () => {
        const type = this.passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        this.passwordInput.setAttribute('type', type);
      });
    }

    // Add Achievement buttons
    if (this.addBtn) {
      this.addBtn.addEventListener('click', () => {
        sound.playClick();
        this.openAddModal();
      });
    }
    if (this.bannerAddBtn) {
      this.bannerAddBtn.addEventListener('click', () => {
        sound.playClick();
        this.openAddModal();
      });
    }

    // Tier change updates auto-badge suggestion
    if (this.fieldTier) {
      this.fieldTier.addEventListener('change', () => {
        const tier = this.fieldTier.value;
        const suggestions = {
          'winner': '🏆 Winner',
          'runner-up': '🥈 2nd Place / Runner-Up',
          'third-place': '🥉 3rd Place / 2nd Runner-Up',
          'finalist': '🎖️ Finalist',
          'special': '🌟 Track Winner / Bounty'
        };
        if (!this.fieldBadge.value || Object.values(suggestions).some(s => s === this.fieldBadge.value)) {
          this.fieldBadge.value = suggestions[tier] || '🏆 Winner';
        }
      });
    }

    // Achievement Form Submit
    this.achievementForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.saveAchievement();
    });

    // Logout
    if (this.logoutBtn) {
      this.logoutBtn.addEventListener('click', () => {
        this.logout();
      });
    }

    // Settings & Actions
    if (this.settingsBtn) {
      this.settingsBtn.addEventListener('click', () => this.openSettingsModal());
    }

    if (this.settingsForm) {
      this.settingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.changePassword();
      });
    }

    if (this.exportBtn) {
      this.exportBtn.addEventListener('click', () => this.exportData());
    }

    if (this.resetBtn) {
      this.resetBtn.addEventListener('click', () => this.confirmReset());
    }

    if (this.importInput) {
      this.importInput.addEventListener('change', (e) => this.handleImport(e));
    }

    // Modal Close Buttons
    document.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal-overlay');
        if (modal) this.closeModal(modal);
      });
    });

    // Close on overlay backdrop click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          this.closeModal(overlay);
        }
      });
    });
  }

  isAuthenticated() {
    return Boolean(this.token);
  }

  checkSession() {
    if (this.isAuthenticated()) {
      document.body.classList.add('is-admin');
      this.adminLockBtn.classList.add('logged-in');
      this.adminLockBtn.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
        </svg>
        <span>Admin Active</span>
      `;
    } else {
      document.body.classList.remove('is-admin');
      this.adminLockBtn.classList.remove('logged-in');
      this.adminLockBtn.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
        <span>Admin Portal</span>
      `;
    }
  }

  openLoginModal() {
    this.loginError.style.display = 'none';
    this.passwordInput.value = '';
    this.loginModal.classList.add('active');
    setTimeout(() => this.passwordInput.focus(), 100);
  }

  async handleLogin() {
    const password = this.passwordInput.value.trim();
    if (!password) return;

    try {
      // Try backend first
      let success = false;
      let token = null;

      try {
        const res = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          success = true;
          token = data.token;
        }
      } catch (networkErr) {
        // Fallback to local static check if offline or file://
        if (password === this.staticPassword) {
          success = true;
          token = 'local-admin-token-' + Date.now();
        }
      }

      if (success) {
        this.token = token;
        sessionStorage.setItem('admin_token', token);
        if (this.rememberCheck && this.rememberCheck.checked) {
          localStorage.setItem('admin_token', token);
        }
        this.closeModal(this.loginModal);
        this.checkSession();
        sound.playFanfare();
        triggerConfetti(0.5, 0.4);
        this.app.showToast('Logged in as Administrator. Edit mode unlocked!', 'success');
        this.app.renderSlides();
      } else {
        sound.playError();
        this.loginError.textContent = 'Incorrect admin password. Please try again.';
        this.loginError.style.display = 'block';
        this.passwordInput.classList.add('error-shake');
        setTimeout(() => this.passwordInput.classList.remove('error-shake'), 500);
      }
    } catch (err) {
      sound.playError();
      this.loginError.textContent = 'Login error. Try again.';
      this.loginError.style.display = 'block';
    }
  }

  logout() {
    this.token = null;
    sessionStorage.removeItem('admin_token');
    localStorage.removeItem('admin_token');
    this.checkSession();
    this.closeModal(this.settingsModal);
    sound.playClick();
    this.app.showToast('Logged out of Admin Portal.', 'info');
    this.app.renderSlides();
  }

  openAddModal(presetYear = null) {
    if (!this.isAuthenticated()) {
      this.openLoginModal();
      return;
    }
    this.editingId = null;
    this.achievementForm.reset();
    this.fieldId.value = '';
    this.modalActionTitle.textContent = 'Add New Achievement';

    // Populate Year options
    this.populateYearOptions(presetYear || this.app.getCurrentSlideYear() || 2026);
    this.fieldTier.value = 'winner';
    this.fieldBadge.value = '🏆 Winner';

    this.achievementModal.classList.add('active');
    setTimeout(() => this.fieldTitle.focus(), 100);
  }

  openEditModal(achievement) {
    if (!this.isAuthenticated()) {
      this.openLoginModal();
      return;
    }
    this.editingId = achievement.id;
    this.modalActionTitle.textContent = 'Edit Achievement';

    this.populateYearOptions(achievement.year);
    this.fieldId.value = achievement.id;
    this.fieldYear.value = achievement.year;
    this.fieldTitle.value = achievement.title;
    this.fieldPosition.value = achievement.position || '';
    this.fieldTier.value = achievement.awardTier || 'winner';
    this.fieldCategory.value = achievement.category || '';
    this.fieldOrg.value = achievement.organization || '';
    this.fieldDesc.value = achievement.description || '';
    this.fieldBadge.value = achievement.badge || '';
    this.fieldTags.value = Array.isArray(achievement.tags) ? achievement.tags.join(', ') : (achievement.tags || '');
    this.fieldFeatured.checked = Boolean(achievement.featured);

    this.achievementModal.classList.add('active');
    setTimeout(() => this.fieldTitle.focus(), 100);
  }

  populateYearOptions(selectedYear) {
    const existingYears = this.app.getAvailableYears();
    // Include 2023, 2024, 2025, 2026, and upcoming years
    const yearsSet = new Set([...existingYears, 2023, 2024, 2025, 2026, 2027]);
    const sortedYears = Array.from(yearsSet).sort((a, b) => b - a);

    this.fieldYear.innerHTML = sortedYears.map(y => `
      <option value="${y}" ${parseInt(selectedYear, 10) === y ? 'selected' : ''}>${y}</option>
    `).join('') + `<option value="custom">+ Custom Year...</option>`;

    this.fieldYear.onchange = () => {
      if (this.fieldYear.value === 'custom') {
        const custom = prompt('Enter 4-digit Year (e.g. 2027):');
        if (custom && /^\d{4}$/.test(custom.trim())) {
          const newOpt = document.createElement('option');
          newOpt.value = custom.trim();
          newOpt.textContent = custom.trim();
          newOpt.selected = true;
          this.fieldYear.insertBefore(newOpt, this.fieldYear.firstChild);
        } else {
          this.fieldYear.value = selectedYear || 2026;
        }
      }
    };
  }

  async saveAchievement() {
    const year = parseInt(this.fieldYear.value, 10);
    const title = this.fieldTitle.value.trim();
    if (!title || isNaN(year)) {
      alert('Please fill out the Title and Year.');
      return;
    }

    const payload = {
      id: this.editingId || `ach-${year}-${Date.now().toString(36)}`,
      year,
      title,
      position: this.fieldPosition.value.trim() || 'Winner',
      awardTier: this.fieldTier.value || 'winner',
      category: this.fieldCategory.value.trim() || 'Hackathon & Innovation',
      organization: this.fieldOrg.value.trim(),
      description: this.fieldDesc.value.trim(),
      badge: this.fieldBadge.value.trim() || '🏆 Winner',
      featured: this.fieldFeatured.checked,
      tags: this.fieldTags.value.split(',').map(t => t.trim()).filter(Boolean)
    };

    let saved = false;

    // Try API request
    try {
      const url = this.editingId ? `/api/achievements/${encodeURIComponent(this.editingId)}` : '/api/achievements';
      const method = this.editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        saved = true;
      }
    } catch (e) {
      // offline/file mode fallback
    }

    // Always update app local dataset
    if (this.editingId) {
      const idx = this.app.achievements.findIndex(a => a.id === this.editingId);
      if (idx !== -1) {
        this.app.achievements[idx] = payload;
      }
    } else {
      this.app.achievements.unshift(payload);
    }

    // Save to localStorage as backup
    this.app.saveLocalBackup();

    this.closeModal(this.achievementModal);
    sound.playFanfare();
    triggerConfetti(0.5, 0.4);

    this.app.showToast(this.editingId ? 'Achievement updated successfully!' : 'Achievement added to ' + year + '!', 'success');
    this.app.renderSlides();

    // Navigate to that year's slide
    this.app.goToYearSlide(year);
  }

  confirmDelete(id, title) {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;
    this.deleteAchievement(id);
  }

  async deleteAchievement(id) {
    try {
      await fetch(`/api/achievements/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });
    } catch (e) {}

    this.app.achievements = this.app.achievements.filter(a => a.id !== id);
    this.app.saveLocalBackup();
    sound.playClick();
    this.app.showToast('Achievement deleted', 'info');
    this.app.renderSlides();
  }

  openSettingsModal() {
    this.settingsModal.classList.add('active');
  }

  async changePassword() {
    const newPass = document.getElementById('new-admin-password').value.trim();
    if (!newPass || newPass.length < 4) {
      alert('Password must be at least 4 characters long.');
      return;
    }

    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({ newPassword: newPass })
      });
      if (res.ok) {
        this.staticPassword = newPass;
        localStorage.setItem('static_admin_password', newPass);
        document.getElementById('new-admin-password').value = '';
        sound.playFanfare();
        this.app.showToast('Admin password successfully changed!', 'success');
        this.closeModal(this.settingsModal);
        return;
      }
    } catch (e) {}

    // Fallback locally
    this.staticPassword = newPass;
    localStorage.setItem('static_admin_password', newPass);
    document.getElementById('new-admin-password').value = '';
    sound.playFanfare();
    this.app.showToast('Admin password updated locally!', 'success');
    this.closeModal(this.settingsModal);
  }

  async confirmReset() {
    if (!confirm('Reset all achievements back to the original whiteboard photo dataset? Any unsaved edits will be replaced.')) {
      return;
    }

    try {
      const res = await fetch('/api/admin/reset', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        this.app.achievements = data.data;
      } else {
        this.app.achievements = JSON.parse(JSON.stringify(INITIAL_ACHIEVEMENTS));
      }
    } catch (e) {
      this.app.achievements = JSON.parse(JSON.stringify(INITIAL_ACHIEVEMENTS));
    }

    this.app.saveLocalBackup();
    this.closeModal(this.settingsModal);
    sound.playFanfare();
    triggerConfetti(0.5, 0.4);
    this.app.showToast('Dataset restored to whiteboard achievements!', 'success');
    this.app.renderSlides();
  }

  exportData() {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(this.app.achievements, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `achievements_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    this.app.showToast('Achievements exported as JSON backup', 'success');
  }

  handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (Array.isArray(imported)) {
          this.app.achievements = imported;
          this.app.saveLocalBackup();

          try {
            await fetch('/api/admin/import', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.token}`
              },
              body: JSON.stringify(imported)
            });
          } catch (netErr) {}

          this.closeModal(this.settingsModal);
          sound.playFanfare();
          triggerConfetti(0.5, 0.4);
          this.app.showToast(`Imported ${imported.length} achievements!`, 'success');
          this.app.renderSlides();
        } else {
          alert('Invalid file format. Must be a JSON array of achievements.');
        }
      } catch (err) {
        alert('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
  }

  closeModal(modal) {
    if (modal) {
      modal.classList.remove('active');
    }
  }
}
