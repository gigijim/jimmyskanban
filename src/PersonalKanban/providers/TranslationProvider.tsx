import React from "react";
import { I18nextProvider, initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import i18next from "i18next";

import en from "PersonalKanban/assets/locales/en/translations.json";
import jp from "PersonalKanban/assets/locales/jp/translations.json";
import tw from "PersonalKanban/assets/locales/tw/translations.json";

export { useTranslation } from "react-i18next";

const i18n = i18next.createInstance();

i18n
  .use(initReactI18next)
  .use(LanguageDetector)
  .init({
    // 只支援繁體中文 / 英文 / 日文；其他中文（含舊版選過的簡體）改用繁體，其餘語言用英文
    fallbackLng: (code: string) => (/^(zh|cn)/i.test(code || "") ? ["tw", "en"] : ["en"]),
    resources: {
      en: { translation: { ...en } },
      jp: { translation: { ...jp } },
      ja: { translation: { ...jp } }, // 瀏覽器語系 ja / ja-JP
      // 繁體中文：瀏覽器語系 zh-TW / zh-HK / zh-Hant / zh 都對應到這裡
      tw: { translation: { ...tw } },
      "zh-TW": { translation: { ...tw } },
      "zh-HK": { translation: { ...tw } },
      "zh-Hant": { translation: { ...tw } },
      zh: { translation: { ...tw } },
    },
    interpolation: {
      escapeValue: false,
    },
  });

type TranslationProviderProps = {};

const TranslationProvider: React.FC<TranslationProviderProps> = ({
  children,
}) => {
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
};

export default TranslationProvider;
