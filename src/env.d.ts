/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare interface Window {
  wps?: any
  Application?: any
  WpsInvoke?: any
  OnOpenWordFormatter?: (control?: any) => void
  OnQuickScanDoc?: (control?: any) => void
  OnUndoLastFormat?: (control?: any) => void
}

declare const wps: any
