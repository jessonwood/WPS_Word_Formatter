import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { registerRibbonHandlers } from './addin/wps/ribbonHandlers'
import { logger } from './shared/logger/logger'

logger.info('App', 'Initializing WPS Word Formatter Add-in...')

// 1. Register global ribbon callbacks for WPS host
registerRibbonHandlers()

// 2. Initialize and mount Vue App safely
function initVueApp() {
  const container = document.getElementById('app')
  if (!container) {
    logger.warn('App', 'Target #app not yet in DOM, waiting for DOMContentLoaded...')
    return false
  }

  const app = createApp(App)
  const pinia = createPinia()

  app.use(pinia)
  app.mount(container)

  logger.info('App', 'WPS Word Formatter Add-in mounted successfully')
  return true
}

if (!initVueApp()) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initVueApp()
    })
  } else {
    // If readyState is already interactive or complete
    window.addEventListener('load', () => {
      initVueApp()
    })
  }
}
