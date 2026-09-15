import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { logger } from './shared/logger/logger'
import { getWpsHostInfo } from './addin/wps/systemApi'

/**
 * Bootstrap lazily so opening WPS Spreadsheets/Presentation never imports the Writer
 * formatter graph. This is important because importing the full app initializes the
 * Writer adapter/store and must only happen inside an actual Writer host.
 */
async function bootstrap() {
  const host = getWpsHostInfo()

  if (host.isWps && !host.isWriter) {
    logger.info(
      'App',
      `WPS Word Formatter ignored non-Writer host (${host.kind || 'unknown'}). No Writer API will be initialized.`
    )
    return
  }

  logger.info('App', 'Initializing WPS Word Formatter Add-in...')

  // Delay Writer-specific modules until after the side-effect-free host gate passes.
  const [{ default: App }, ribbonModule] = await Promise.all([
    import('./App.vue'),
    import('./addin/wps/ribbonHandlers')
  ])

  if (host.isWps) {
    ribbonModule.registerRibbonHandlers()
  }

  const initVueApp = () => {
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
      }, { once: true })
    } else {
      window.addEventListener('load', () => {
        initVueApp()
      }, { once: true })
    }
  }
}

void bootstrap().catch((err) => {
  logger.error('App', 'Failed to bootstrap WPS Word Formatter Add-in', err)
})
