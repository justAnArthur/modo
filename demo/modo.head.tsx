// blocking <script> body for the lib's layout. runs before the browser
// paints so a stored theme/color-scheme/etc. is applied to <html>
// before the user sees the wrong one. the lib's layout renders this
// string as a <script dangerouslySetInnerHTML> at the top of <body>
// (the parser pauses for inline scripts, so the theme is set before
// any visible <body> content is parsed).
//
// swap the SCRIPT string for your own — the lib ships no theme
// handling of its own because the storage key + attribute name are
// user choices.

const STORAGE_KEY = 'theme'
const ATTR = 'data-theme'

export const SCRIPT = `try{var v=localStorage.getItem(${JSON.stringify(STORAGE_KEY)});if(v==='light'||v==='dark'){document.documentElement.setAttribute(${JSON.stringify(ATTR)},v)}else{document.documentElement.removeAttribute(${JSON.stringify(ATTR)})}}catch(e){}`
