// src/i18n.ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import uz from "./locales/uz-Latn/translation.json";
import ru from "./locales/ru/translation.json";

export const availableLocales = [
  { code: "uz-Latn", label: "O'zbek (lotin)" },
  { code: "ru", label: "Русский" }
] as const;

const resources = {
  "uz-Latn": { translation: uz },
  ru: { translation: ru }
};

function resolveDefaultLang(): string {
  const stored = localStorage.getItem("blazor.culture");
  if (stored && Object.keys(resources).includes(stored)) return stored;

  const nav = (navigator.language || navigator.languages?.[0] || "uz-Latn").toLowerCase();

  if (nav.startsWith("ru")) return "ru";
  if (nav.startsWith("uz")) return "uz-Latn";
  // default
  return "uz-Latn";
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: resolveDefaultLang(),
    fallbackLng: "uz-Latn",
    interpolation: { escapeValue: false },
    react: { useSuspense: false }
  })
  .catch((e) => console.warn("i18n init err", e));

export default i18n;
