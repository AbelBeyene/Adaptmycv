/// <reference types="vite/client" />

declare module 'vite/client' {
  interface ImportMetaEnv {
    readonly VITE_GEMINI_API_KEY: string
    readonly VITE_GEMINI_API_KEY_2?: string
    readonly VITE_GEMINI_API_URL?: string
    readonly VITE_GEMINI_MODEL?: string
    readonly VITE_RAPIDAPI_KEY?: string
  }
  interface ImportMeta {
    readonly env: ImportMetaEnv
  }
}
