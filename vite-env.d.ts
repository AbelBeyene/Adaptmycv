export {}

declare global {
  interface ImportMetaEnv {
    // Add env variables here
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv
  }
}
