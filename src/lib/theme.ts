export type Theme = "light" | "dark";

const CACHE_KEY = "axiumz-theme";

/** Last theme used on this device: lets the first paint match before the profile has loaded. */
export function readCachedTheme(): Theme {
  try {
    return localStorage.getItem(CACHE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function applyTheme(theme: Theme, animate = false): void {
  const root = document.documentElement;
  if (animate) {
    root.classList.add("theme-switching");
    window.setTimeout(() => root.classList.remove("theme-switching"), 400);
  }
  root.dataset.theme = theme;
  try {
    localStorage.setItem(CACHE_KEY, theme);
  } catch {
    /* storage unavailable: the database value still applies on next load */
  }
}

/** Back to the public site's look (it has no dark mode). */
export function clearTheme(): void {
  delete document.documentElement.dataset.theme;
}
