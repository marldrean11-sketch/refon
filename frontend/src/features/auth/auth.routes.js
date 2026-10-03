export const AUTH_ROUTES = Object.freeze({
  home: '/',
  login: '/login',
  register: '/register',
  admin: '/admin',
  seller: '/seller',
  sellerInquiries: '/seller/inquiries',
  buyer: '/browse',
  saved: '/saved',
  myInquiries: '/my-inquiries',
  forbidden: '/forbidden',
})

export const ROLE_HOME = Object.freeze({
  ADMIN: AUTH_ROUTES.admin,
  SELLER: AUTH_ROUTES.seller,
  BUYER: AUTH_ROUTES.buyer,
})

export function getRoleHome(role) {
  return ROLE_HOME[role] ?? AUTH_ROUTES.login
}
