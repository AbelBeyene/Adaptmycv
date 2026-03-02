/// <reference types="vite/client" />

declare module 'vite/client' {
  interface ImportMetaEnv {
    readonly VITE_GEMINI_API_KEY: string
    readonly VITE_GEMINI_API_URL: string
  }
  interface ImportMeta {
    readonly env: ImportMetaEnv
  }
}
