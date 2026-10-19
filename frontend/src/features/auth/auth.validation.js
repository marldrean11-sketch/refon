const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Control characters, which have no legitimate place in a route.
 *
 * The escapes cover C0 (including tab, newline and carriage return), DEL, and the
 * C1 range. Written as escapes rather than literals so the pattern stays readable
 * and cannot itself introduce invisible bytes into this file.
 */
// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001F\u007F-\u009F]/

export function validateLoginForm({ email, password }) {
  const errors = {}

  if (!email.trim()) {
    errors.email = 'Email is required.'
  } else if (!emailPattern.test(email.trim())) {
    errors.email = 'Enter a valid email address.'
  }

  if (!password) {
    errors.password = 'Password is required.'
  }

  return errors
}

export function validateRegisterForm({ name, email, password, role, businessName = '' }) {
  const errors = validateLoginForm({ email, password })

  if (!name.trim()) {
    errors.name = 'Name is required.'
  } else if (name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters.'
  } else if (name.trim().length > 120) {
    errors.name = 'Name must be 120 characters or fewer.'
  }

  if (password && password.length < 8) {
    errors.password = 'Password must be at least 8 characters.'
  } else if (password.length > 72) {
    errors.password = 'Password must be 72 characters or fewer.'
  }

  if (!['BUYER', 'SELLER'].includes(role)) {
    errors.role = 'Choose whether you are buying or selling.'
  }

  const storeName = businessName.trim()
  if (role === 'SELLER' && !storeName) {
    errors.businessName = 'Enter your store name. Buyers see it on your listings.'
  } else if (role === 'SELLER' && storeName.length < 2) {
    errors.businessName = 'Store name must be at least 2 characters.'
  } else if (role === 'SELLER' && storeName.length > 80) {
    errors.businessName = 'Store name must be 80 characters or fewer.'
  }

  return errors
}

/**
 * A redirect target that is safe to send a browser to.
 *
 * Only a same-origin relative path is accepted. Everything else falls back.
 *
 * The rejections, and what each one stops:
 *
 *   - `//host` and `/\host` are protocol-relative URLs. A browser reads `//evil.com`
 *     as a different origin, so a target starting `//` would send the shopper (and
 *     any session cookie riding along on a non-SameSite request) off-site. The
 *     backslash form matters because several browsers normalise `\` to `/` before
 *     resolving, so `/\evil.com` is a live bypass of the `//` check alone.
 *   - Any scheme (`https:`, `javascript:`, `data:`) is refused. A target that does
 *     not begin with a single `/` cannot be a path.
 *   - Control characters are refused. A newline or tab inside the target can be
 *     used to smuggle a second header or to defeat a naive prefix comparison, and
 *     they have no legitimate place in a route.
 *
 * The check is applied at the point of use rather than trusted from storage, because
 * router state and query parameters are both writable by the person using the
 * browser.
 */
export function getSafeDestination(candidate, fallback) {
  if (typeof candidate !== 'string' || candidate.length === 0) {
    return fallback
  }

  if (!candidate.startsWith('/')) {
    return fallback
  }

  // Protocol-relative, in either slash direction.
  if (candidate.startsWith('//') || candidate.startsWith('/\\')) {
    return fallback
  }

  // Control characters, including the encoded forms a router or storage layer might
  // hand back decoded.
  if (CONTROL_CHARACTER_PATTERN.test(candidate)) {
    return fallback
  }

  return candidate
}
