import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'

// Configure @monaco-editor/react to use local monaco-editor instead of CDN
loader.config({ monaco })

// Expose monaco to window for global access (needed by decorations)
if (typeof window !== 'undefined') {
  (window as any).monaco = monaco;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
