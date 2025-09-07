import React, { useEffect, useRef, useState } from "react";

const SUPPORTED: Array<{ code: string; label: string }> = [
  { code: "uz-Latn", label: "O'zbekcha 🇺🇿" },
  { code: "ru", label: "Русский 🇷🇺" },
];

// same storage key your Blazor app uses
const BLazorCultureKey = "blazor.culture";

export default function LanguageSwitcher() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<string>(() => {
    try {
      return localStorage.getItem(BLazorCultureKey) || navigator.language || "uz-Latn";
    } catch {
      return "uz-Latn";
    }
  });
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // keep local copy in case something else changed it
    const onStorage = (e: StorageEvent) => {
      if (e.key === BLazorCultureKey) setCurrent(e.newValue ?? "");
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    const onDoc = (ev: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(ev.target as Node)) setOpen(false);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  const toggle = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setOpen(v => !v);
  };

  const setCultureAndReload = (code: string) => {
    try {
      if (code === current) {
        setOpen(false);
        return;
      }
      localStorage.setItem(BLazorCultureKey, code);
    } catch (e) {
      console.warn("Failed to persist culture in localStorage", e);
    }
    // force full reload so the app will re-initialize with new culture (same behavior as Blazor)
    window.location.reload();
  };

  return (
    <div ref={rootRef} className="btn-group position-absolute top-0 end-0 me-5 mt-5">
      <button
        type="button"
        className="btn btn-outline-light btn-lg dropdown-toggle"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={toggle}
      >
        {/* translate icon (same as your Blazor markup) */}
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" className="bi bi-translate" viewBox="0 0 16 16" aria-hidden>
          <path d="M4.545 6.714 4.11 8H3l1.862-5h1.284L8 8H6.833l-.435-1.286zm1.634-.736L5.5 3.956h-.049l-.679 2.022z" />
          <path d="M0 2a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v3h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-3H2a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zm7.138 9.995q.289.451.63.846c-.748.575-1.673 1.001-2.768 1.292.178.217.451.635.555.867 1.125-.359 2.08-.844 2.886-1.494.777.665 1.739 1.165 2.93 1.472.133-.254.414-.673.629-.89-1.125-.253-2.057-.694-2.82-1.284.681-.747 1.222-1.651 1.621-2.757H14V8h-3v1.047h.765c-.318.844-.74 1.546-1.272 2.13a6 6 0 0 1-.415-.492 2 2 0 0 1-.94.31" />
        </svg>
      </button>

      <ul
        className={`dropdown-menu ${open ? "show" : ""}`}
        style={{ minWidth: 0 }}
        role="menu"
        aria-label="Select language"
      >
        {SUPPORTED.map(loc => {
          const disabled = loc.code === current;
          return (
            <li key={loc.code}>
              <button
                type="button"
                role="menuitem"
                className={`dropdown-item ${disabled ? "disabled" : ""}`}
                onClick={() => setCultureAndReload(loc.code)}
                disabled={disabled}
              >
                {loc.label}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
