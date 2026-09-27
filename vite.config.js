import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'url'
import { cspPlugin } from './csp.config.js'

export default defineConfig(({ mode, command }) => ({
  plugins: [vue(), cspPlugin(loadEnv(mode, process.cwd()), { dev: command === 'serve' })],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  define: {
    __VUE_I18N_FULL_INSTALL__: true,
    __VUE_I18N_LEGACY_API__: false,
    __INTLIFY_PROD_DEVTOOLS__: false,
  },
  server: {
    port: 5174
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.spec.js'],
    setupFiles: ['src/test/setup.js'],
  },
}))
