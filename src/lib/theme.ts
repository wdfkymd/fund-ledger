export const THEME_COOKIE = "fund_theme"
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export type Theme = "light" | "dark" | "system"

export function parseTheme(value: string | undefined | null): Theme {
  if (value === "light" || value === "dark" || value === "system") {
    return value
  }
  return "system"
}

export function resolveIsDark(theme: Theme, prefersDark: boolean): boolean {
  if (theme === "dark") return true
  if (theme === "light") return false
  return prefersDark
}

/**
 * 首屏阻塞脚本：paint 前按 Cookie（或旧 localStorage）设 .dark。
 * 不依赖 React，避免 hydrate 闪烁。
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var k="${THEME_COOKIE}";var t=null;var m=document.cookie.match(new RegExp("(?:^|; )"+k+"=([^;]*)"));if(m)t=decodeURIComponent(m[1]);if(t!=="light"&&t!=="dark"&&t!=="system"){try{var ls=localStorage.getItem("theme");if(ls==="light"||ls==="dark"||ls==="system"){t=ls;document.cookie=k+"="+encodeURIComponent(t)+"; path=/; max-age=${THEME_COOKIE_MAX_AGE}; SameSite=Lax";}}catch(e){}}if(t!=="light"&&t!=="dark"&&t!=="system")t="system";var dark=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;if(dark)r.classList.add("dark");else r.classList.remove("dark");r.style.colorScheme=dark?"dark":"light";}catch(e){}})();`

export function writeThemeCookie(theme: Theme) {
  document.cookie = `${THEME_COOKIE}=${encodeURIComponent(theme)}; path=/; max-age=${THEME_COOKIE_MAX_AGE}; SameSite=Lax`
}

export function applyDocumentTheme(theme: Theme) {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
  const dark = resolveIsDark(theme, prefersDark)
  document.documentElement.classList.toggle("dark", dark)
  document.documentElement.style.colorScheme = dark ? "dark" : "light"
}
