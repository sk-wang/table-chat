import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// @ts-ignore - vite-plugin-monaco-editor is a CommonJS module
import monacoEditorPluginModule from 'vite-plugin-monaco-editor'

const monacoEditorPlugin = (monacoEditorPluginModule as any).default || monacoEditorPluginModule

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    monacoEditorPlugin({}),
  ],
})
