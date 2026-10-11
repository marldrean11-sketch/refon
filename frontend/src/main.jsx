import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// ReFon's three typefaces, bundled rather than fetched, so the site makes no
// request to a font CDN and renders identically offline. Unbounded carries the
// headings and the wordmark, Geist is the reading face, and Geist Mono sets every
// measured figure. The imports live here rather than in `index.css` because a
// bare specifier inside a CSS `@import` depends on PostCSS resolving
// node_modules, and this form is guaranteed to work in both dev and build.
import '@fontsource-variable/unbounded'
import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)