import en from './locale/en';

const localeLoaders = {
  ar: () => import('./locale/ar'),
  bg: () => import('./locale/bg'),
  ca: () => import('./locale/ca'),
  cs: () => import('./locale/cs'),
  da: () => import('./locale/da'),
  de: () => import('./locale/de'),
  el: () => import('./locale/el'),
  es: () => import('./locale/es'),
  et: () => import('./locale/et'),
  fa: () => import('./locale/fa'),
  fi: () => import('./locale/fi'),
  fr: () => import('./locale/fr'),
  he: () => import('./locale/he'),
  hi: () => import('./locale/hi'),
  hu: () => import('./locale/hu'),
  id: () => import('./locale/id'),
  is: () => import('./locale/is'),
  it: () => import('./locale/it'),
  ja: () => import('./locale/ja'),
  ko: () => import('./locale/ko'),
  lt: () => import('./locale/lt'),
  lv: () => import('./locale/lv'),
  ml: () => import('./locale/ml'),
  nl: () => import('./locale/nl'),
  no: () => import('./locale/no'),
  pl: () => import('./locale/pl'),
  pt: () => import('./locale/pt'),
  pt_BR: () => import('./locale/pt_BR'),
  ro: () => import('./locale/ro'),
  ru: () => import('./locale/ru'),
  sk: () => import('./locale/sk'),
  sl: () => import('./locale/sl'),
  sr: () => import('./locale/sr'),
  sv: () => import('./locale/sv'),
  ta: () => import('./locale/ta'),
  th: () => import('./locale/th'),
  tr: () => import('./locale/tr'),
  uk: () => import('./locale/uk'),
  uz: () => import('./locale/uz'),
  vi: () => import('./locale/vi'),
  zh_CN: () => import('./locale/zh_CN'),
  zh_TW: () => import('./locale/zh_TW'),
};

// Only English ships in the main bundle; every other language is its own chunk,
// fetched the first time the UI switches to it.
export const loadLocaleMessages = async (i18n, locale) => {
  const load = localeLoaders[locale];
  if (!load || i18n.availableLocales.includes(locale)) return;
  const { default: messages } = await load();
  i18n.setLocaleMessage(locale, messages);
};

const LOCALE_STORAGE_KEY = 'chatwoot_ui_locale';

// The server only knows the installation default at page load, so the language
// the user last used is remembered in the browser and requested first.
export const getInitialLocale = () =>
  localStorage.getItem(LOCALE_STORAGE_KEY) ||
  window.chatwootConfig.selectedLocale;

export const rememberLocale = locale =>
  localStorage.setItem(LOCALE_STORAGE_KEY, locale);

export default { en };
