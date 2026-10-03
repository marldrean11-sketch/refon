export function isImageReference(reference) {
  return (
    typeof reference === 'string' &&
    (/^(https?:|data:image|blob:)/i.test(reference) || reference.startsWith('/'))
  )
}
