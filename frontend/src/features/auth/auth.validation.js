const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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

export function validateRegisterForm({ name, email, password, role }) {
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

  return errors
}

export function getSafeDestination(candidate, fallback) {
  return typeof candidate === 'string' && candidate.startsWith('/') && !candidate.startsWith('//')
    ? candidate
    : fallback
}
