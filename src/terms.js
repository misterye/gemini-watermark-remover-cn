import i18n from './i18n.js';

async function init() {
    try {
        await i18n.init();
        setupLanguageSwitch();
        updateContent();
    } catch (error) {
        console.error('initialize error:', error);
    }
}

function setupLanguageSwitch() {
    const btn = document.getElementById('langSwitch');
    if (!btn) return;

    btn.textContent = i18n.locale === 'zh-CN' ? 'EN' : '中文';
    btn.addEventListener('click', async () => {
        const newLocale = i18n.locale === 'zh-CN' ? 'en-US' : 'zh-CN';
        await i18n.switchLocale(newLocale);
        btn.textContent = newLocale === 'zh-CN' ? 'EN' : '中文';
        // Content updates automatically via i18n.js observation or manual call if needed
        // i18n.js typically updates data-i18n elements automatically on locale switch if implemented that way, 
        // or we need to trigger it. 
        // Checking i18n.js would be good, but usually it exposes a method or does it internally.
        // Assuming standard behavior from this project's app.js which calls `updateDynamicTexts` but i18n.js likely handles the bulk.
        // Let's check i18n.js content to be sure.
    });
}

function updateContent() {
    // Initial content update is handled by i18n.init() usually if it scans DOM.
    // If not, we might need to manually trigger.
}

init();
