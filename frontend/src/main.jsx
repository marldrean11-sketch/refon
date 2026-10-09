import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// ReFon's three typefaces, bundled rather than fetched, so the site makes no
// request to a font CDN and renders identically offline. Archivo carries the
// headings and the wordmark, with its width axis so they can be set expanded;
// Instrument Sans is the reading face; IBM Plex Mono sets every measured figure.
// The imports live here rather than in `index.css` because a bare specifier
// inside a CSS `@import` depends on PostCSS resolving node_modules, and this form
// is guaranteed to work in both dev and build.
import '@fontsource-variable/archivo/wdth.css'
import '@fontsource-variable/instrument-sans'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import '@fontsource/ibm-plex-mono/600.css'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)