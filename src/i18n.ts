// src/i18n.ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import uz from "./locales/uz-Latn/translation.json";
import ru from "./locales/ru/translation.json";

const resources = {
  "uz-Latn": { translation: uz },
  "ru": { translation: ru }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem("blazor.culture") ?? "uz-Latn",
    fallbackLng: "uz-Latn",
    interpolation: { escapeValue: false },
    react: { useSuspense: false }
  })
  .catch((e) => console.warn("i18n init err", e));

export default i18n;
