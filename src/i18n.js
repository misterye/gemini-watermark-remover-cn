const i18n = {
  locale: localStorage.getItem('locale') || (navigator.language.startsWith('zh') ? 'zh-CN' : 'en-US'),
  translations: {},

  async init() {
    await this.loadTranslations(this.locale);
    this.applyTranslations();
    document.body.classList.remove('loading');
  },

  async loadTranslations(locale) {
    try {
      console.log(`[i18n] Loading translations for: ${locale}`);
      const url = `/i18n/${locale}.json?_=${Date.now()}`;
      console.log(`[i18n] Fetching from: ${url}`);
      const res = await fetch(url);
      console.log(`[i18n] Response status: ${res.status}`);

      if (!res.ok) {
        throw new Error(`Failed to load ${locale} translations: ${res.status}`);
      }

      this.translations = await res.json();
      this.locale = locale;
      localStorage.setItem('locale', locale);
      console.log(`[i18n] Successfully loaded ${Object.keys(this.translations).length} translation keys for ${locale}`);
    } catch (err) {
      console.error('[i18n] Load error:', err);
      console.error('[i18n] Current location:', window.location.href);
      console.error('[i18n] Attempted locale:', locale);
      // Fallback to empty translations to prevent total crash
      this.translations = this.translations || {};
    }
  },

  t(key) {
    return this.translations[key] || key;
  },

  applyTranslations() {
    document.documentElement.lang = this.locale;
    document.title = this.t('title');
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (el.tagName === 'INPUT' && el.placeholder !== undefined) {
        el.placeholder = this.t(key);
      } else {
        el.textContent = this.t(key);
      }
    });
  },

  async switchLocale(locale) {
    await this.loadTranslations(locale);
    this.applyTranslations();
  }
};

export default i18n;
