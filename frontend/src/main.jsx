import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// ReFon's only typeface, bundled rather than fetched. `@fontsource-variable`
// resolves to a local `@font-face` for the variable `wght` axis (200-800), which
// covers every weight the product uses — so the site makes no request to a font
// CDN, renders identically offline, and costs one woff2 instead of one file per
// weight per style. The import lives here rather than at the top of `index.css`
// because a bare specifier inside a CSS `@import` depends on PostCSS resolving
// node_modules, and this form is guaranteed to work in both dev and build.
import '@fontsource-variable/manrope'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)