export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "study-theme";
export const THEME_COLORS = { light: "#fdf4e3", dark: "#080a14" } as const;

// Run synchronously in <head> so a saved night theme is applied before paint.
export const THEME_INIT_SCRIPT = `(function(){var t="light";try{if(localStorage.getItem("${THEME_STORAGE_KEY}") === "dark")t="dark"}catch(e){}document.documentElement.dataset.theme=t})()`;

export function getTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLORS[theme]);
}

export function setTheme(theme: Theme) {
  applyTheme(theme);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // The switch still works when browser storage is unavailable.
  }
}

export function subscribeToTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  const syncTab = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY || event.key === null) {
      applyTheme(event.newValue === "dark" ? "dark" : "light");
    }
  };
  window.addEventListener("storage", syncTab);
  return () => {
    observer.disconnect();
    window.removeEventListener("storage", syncTab);
  };
}
