import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../locales/en.json';
import fa from '../locales/fa.json';

const savedLang = localStorage.getItem('irnc_lang') || 'en';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      fa: { translation: fa }
    },
    lng:          savedLang,
    fallbackLng:  'en',
    interpolation: { escapeValue: false }
  });

function applyLanguage(lng) {
  const isRtl = lng === 'fa';
  document.documentElement.lang = lng;
  document.documentElement.dir  = isRtl ? 'rtl' : 'ltr';
  document.body.style.fontFamily = isRtl
    ? "'Vazirmatn', 'Tahoma', sans-serif"
    : "'Inter', system-ui, -apple-system, sans-serif";
  localStorage.setItem('irnc_lang', lng);
}

applyLanguage(savedLang);
i18n.on('languageChanged', applyLanguage);

export default i18n;
