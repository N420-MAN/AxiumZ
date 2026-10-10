import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Preload the fonts used by the first screen (hero headline + body text) so they
// start downloading with the HTML instead of after the CSS has been parsed.
function preloadCriticalFonts(): Plugin {
  const critical = [/poppins-latin-800-normal.*\.woff2$/, /inter-latin-400-normal.*\.woff2$/, /inter-latin-500-normal.*\.woff2$/]
  return {
    name: 'preload-critical-fonts',
    transformIndexHtml(_html, ctx) {
      if (!ctx.bundle) return
      return Object.keys(ctx.bundle)
        .filter((file) => critical.some((re) => re.test(file)))
        .map((file) => ({
          tag: 'link',
          attrs: { rel: 'preload', as: 'font', type: 'font/woff2', href: `/${file}`, crossorigin: '' },
          injectTo: 'head' as const,
        }))
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), preloadCriticalFonts()],
})
