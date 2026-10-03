import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

process.env.NODE_ENV = 'test'

const testRun = Date.now()
const { default: app } = await import(
  new URL(`../src/app.js?marketplace-e2e=${testRun}`, import.meta.url)
)
const { prisma } = await import(
  new URL(`../src/config/prisma.js?marketplace-e2e=${testRun}`, import.meta.url)
)
const { uploadsDirectory } = await import('../src/config/uploads.js')

const testPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
)

const server = app.listen(0, '127.0.0.1')
await new Promise((resolve) => server.once('listening', resolve))
const baseUrl = `http://127.0.0.1:${server.address().port}`

let createdListingIds = []
const createdNotificationIds = []
const createdUploadFiles = []
let testBuyerId
let inquiryBuyerId
let testSellerId
let rejectedBuyerId
let rejectedSellerId

function cookieFrom(response) {
  const cookie = response.headers.getSetCookie?.()[0]
  return cookie?.split(';')[0] ?? null
}

async function request(path, { cookie, body, ...options } = {}) {
  const headers = {
    Accept: 'application/json',
    ...(body ? { 'Content-Type': 'application/json' } : {}),
    ...(cookie ? { Cookie: cookie } : {}),
    ...options.headers,
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const payload = response.status === 204 ? null : await response.json()
  return { response, payload }
}

async function uploadPhotos(cookie) {
  const formData = new FormData()
  formData.append('photos', new Blob([testPng], { type: 'image/png' }), 'main.png')
  formData.append('photos', new Blob([testPng], { type: 'image/png' }), 'detail.png')

  const response = await fetch(`${baseUrl}/api/uploads`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Cookie: cookie,
    },
    body: formData,
  })
  const payload = await response.json()
  return { response, payload }
}

async function login(email, password) {
  const result = await request('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  })
  assert.equal(result.response.status, 200, JSON.stringify(result.payload))
  const cookie = cookieFrom(result.response)
  assert.ok(cookie)
  return { cookie, user: result.payload.user }
}

try {
  const sellerSession = await login('seller@refon.test', 'SellerTest123!')
  assert.equal(sellerSession.user.role, 'SELLER')

  const profileResult = await request('/api/sellers/me', {
    cookie: sellerSession.cookie,
  })
  assert.equal(profileResult.response.status, 200)
  assert.equal(profileResult.payload.seller.verificationStatus, 'APPROVED')

  const approvedReapply = await request('/api/sellers/apply', {
    method: 'POST',
    cookie: sellerSession.cookie,
    body: {
      businessName: 'Should Not Reset',
      contactInfo: 'should-not-reset@example.test',
    },
  })
  assert.equal(approvedReapply.response.status, 409)
  assert.equal(approvedReapply.payload.code, 'SELLER_ALREADY_APPROVED')

  const sellerStillApproved = await prisma.seller.findUniqueOrThrow({
    where: { userId: sellerSession.user.id },
  })
  assert.equal(sellerStillApproved.verificationStatus, 'APPROVED')
  assert.equal(sellerStillApproved.businessName, 'ReFon Select')

  const uploadResult = await uploadPhotos(sellerSession.cookie)
  assert.equal(uploadResult.response.status, 201, JSON.stringify(uploadResult.payload))
  assert.equal(uploadResult.payload.files.length, 2)
  assert.deepEqual(uploadResult.payload.urls, uploadResult.payload.files.map((file) => file.url))
  assert.ok(uploadResult.payload.urls.every((url) => url.startsWith('/uploads/')))
  createdUploadFiles.push(...uploadResult.payload.files.map((file) => file.filename))

  for (const url of uploadResult.payload.urls) {
    const staticResponse = await fetch(`${baseUrl}${url}`)
    assert.equal(staticResponse.status, 200)
    assert.match(staticResponse.headers.get('content-type') ?? '', /^image\/png/)
  }

  const noPhotoResult = await request('/api/listings', {
    method: 'POST',
    cookie: sellerSession.cookie,
    body: {
      brand: 'Samsung',
      model: `No Photo E2E ${testRun}`,
      year: 2021,
      price: 1000,
      batteryPercent: 90,
      storage: '128 GB',
      condition: 'Good',
      conditionNotes: 'This request should be rejected because it has no photo.',
      photos: [],
    },
  })
  assert.equal(noPhotoResult.response.status, 422)
  assert.equal(noPhotoResult.payload.code, 'VALIDATION_ERROR')

  const externalPhotoResult = await request('/api/listings', {
    method: 'POST',
    cookie: sellerSession.cookie,
    body: {
      brand: 'Samsung',
      model: `External Photo E2E ${testRun}`,
      year: 2021,
      price: 1000,
      batteryPercent: 90,
      storage: '128 GB',
      condition: 'Good',
      conditionNotes: 'This request should be rejected because the photo is hosted externally.',
      photos: ['https://cdn.example.com/photo.png'],
      mainPhoto: 'https://cdn.example.com/photo.png',
    },
  })
  assert.equal(externalPhotoResult.response.status, 422)
  assert.equal(externalPhotoResult.payload.code, 'VALIDATION_ERROR')
  assert.match(externalPhotoResult.payload.errors.photos, /must be uploaded image URLs/i)

  const traversalPhotoResult = await request('/api/listings', {
    method: 'POST',
    cookie: sellerSession.cookie,
    body: {
      brand: 'Samsung',
      model: `Traversal Photo E2E ${testRun}`,
      year: 2021,
      price: 1000,
      batteryPercent: 90,
      storage: '128 GB',
      condition: 'Good',
      conditionNotes: 'This request should be rejected because the photo escapes the uploads folder.',
      photos: ['/uploads/../../prisma/schema.prisma'],
    },
  })
  assert.equal(traversalPhotoResult.response.status, 422)
  assert.match(traversalPhotoResult.payload.errors.photos, /must be uploaded image URLs/i)

  const createResult = await request('/api/listings', {
    method: 'POST',
    cookie: sellerSession.cookie,
    body: {
      brand: 'Samsung',
      model: `Galaxy E2E ${testRun}`,
      year: 2021,
      price: 12345,
      batteryPercent: 91,
      storage: '128 GB',
      condition: 'Excellent',
      color: 'Awesome Blue',
      conditionNotes: 'Clean display and frame with only a faint mark on the rear panel.',
      photos: uploadResult.payload.urls,
      mainPhoto: uploadResult.payload.urls[0],
    },
  })
  assert.equal(createResult.response.status, 201, JSON.stringify(createResult.payload))
  assert.equal(createResult.payload.listing.status, 'PENDING')
  assert.equal(createResult.payload.listing.mainPhoto, uploadResult.payload.urls[0])
  const listingId = createResult.payload.listing.id
  createdListingIds.push(listingId)

  const storedPending = await prisma.listing.findUniqueOrThrow({
    where: { id: listingId },
  })
  assert.equal(storedPending.status, 'PENDING')
  assert.equal(Number(storedPending.price), 12345)
  assert.deepEqual(storedPending.photos, uploadResult.payload.urls)

  const adminSession = await login('admin@refon.test', 'AdminTest123!')
  assert.equal(adminSession.user.role, 'ADMIN')

  const pendingListings = await request('/api/admin/listings/pending', {
    cookie: adminSession.cookie,
  })
  assert.equal(pendingListings.response.status, 200)
  assert.ok(pendingListings.payload.listings.some((listing) => listing.id === listingId))

  const approveResult = await request(`/api/admin/listings/${listingId}/approve`, {
    method: 'PATCH',
    cookie: adminSession.cookie,
  })
  assert.equal(approveResult.response.status, 200)
  assert.equal(approveResult.payload.listing.status, 'APPROVED')

  const storedApproved = await prisma.listing.findUniqueOrThrow({
    where: { id: listingId },
  })
  assert.equal(storedApproved.status, 'APPROVED')

  const approvalNotifications = await request('/api/notifications/mine', {
    cookie: sellerSession.cookie,
  })
  assert.equal(approvalNotifications.response.status, 200)
  const approvalNotification = approvalNotifications.payload.notifications.find(
    (notification) =>
      notification.relatedListingId === listingId &&
      notification.type === 'LISTING_APPROVED',
  )
  assert.ok(approvalNotification)
  assert.match(approvalNotification.message, /approved and is now live/i)
  createdNotificationIds.push(approvalNotification.id)

  const publicSearch = await request(
    `/api/listings?search=${encodeURIComponent(`Galaxy E2E ${testRun}`)}&sort=price-asc`,
  )
  assert.equal(publicSearch.response.status, 200)
  assert.equal(publicSearch.payload.listings.length, 1)
  assert.equal(publicSearch.payload.listings[0].id, listingId)
  assert.ok(publicSearch.payload.brands.includes('Samsung'))

  const publicDetail = await request(`/api/listings/${listingId}`)
  assert.equal(publicDetail.response.status, 200)
  assert.equal(publicDetail.payload.listing.sellerName, 'ReFon Select')

  const inquiryBuyerEmail = `inquiry-buyer-${testRun}@example.test`
  const inquiryBuyerRegistration = await request('/api/auth/register', {
    method: 'POST',
    body: {
      name: 'Inquiry Buyer',
      email: inquiryBuyerEmail,
      password: 'BuyerTest123!',
      role: 'BUYER',
    },
  })
  assert.equal(inquiryBuyerRegistration.response.status, 201)
  inquiryBuyerId = inquiryBuyerRegistration.payload.user.id
  const inquiryBuyerCookie = cookieFrom(inquiryBuyerRegistration.response)

  const inquiryResult = await request(`/api/listings/${listingId}/inquiries`, {
    method: 'POST',
    cookie: inquiryBuyerCookie,
    body: {
      buyerName: 'E2E Buyer',
      buyerContact: 'buyer-e2e@example.test',
      message: 'Is this Samsung still available for pickup?',
    },
  })
  assert.equal(inquiryResult.response.status, 201)
  const inquiryId = inquiryResult.payload.inquiry.id
  const storedInquiry = await prisma.inquiry.findUniqueOrThrow({
    where: { id: inquiryId },
  })
  assert.equal(storedInquiry.listingId, listingId)
  assert.equal(storedInquiry.buyerId, inquiryBuyerId)

  const sellerInquiries = await request(`/api/listings/${listingId}/inquiries`, {
    cookie: sellerSession.cookie,
  })
  assert.equal(sellerInquiries.response.status, 200)
  assert.equal(sellerInquiries.payload.inquiries.length, 1)

  const anonymousInquiry = await request(`/api/listings/${listingId}/inquiries`, {
    method: 'POST',
    body: {
      buyerName: 'Guest Buyer',
      buyerContact: 'guest-buyer@example.test',
      message: 'I am interested while browsing as a guest.',
    },
  })
  assert.equal(anonymousInquiry.response.status, 201)

  const inquiryNotifications = await request('/api/notifications/mine', {
    cookie: sellerSession.cookie,
  })
  assert.equal(inquiryNotifications.response.status, 200)
  const inquiryNotification = inquiryNotifications.payload.notifications.find(
    (notification) =>
      notification.relatedListingId === listingId &&
      notification.type === 'NEW_INQUIRY' &&
      notification.message.includes('E2E Buyer'),
  )
  assert.ok(inquiryNotification)
  assert.match(inquiryNotification.message, /new inquiry from e2e buyer/i)
  createdNotificationIds.push(inquiryNotification.id)

  const markReadResult = await request(
    `/api/notifications/${inquiryNotification.id}/read`,
    { method: 'PATCH', cookie: sellerSession.cookie },
  )
  assert.equal(markReadResult.response.status, 200)
  assert.equal(markReadResult.payload.notification.isRead, true)

  const buyerNotifications = await request('/api/notifications/mine', {
    cookie: inquiryBuyerCookie,
  })
  assert.equal(buyerNotifications.response.status, 200)
  assert.equal(buyerNotifications.payload.unreadCount, 1)
  const inquirySentNotification = buyerNotifications.payload.notifications.find(
    (notification) =>
      notification.relatedListingId === listingId &&
      notification.type === 'INQUIRY_SENT',
  )
  assert.ok(inquirySentNotification)
  assert.match(inquirySentNotification.message, /your inquiry about the samsung/i)
  createdNotificationIds.push(inquirySentNotification.id)

  const otherSeller = await login('circuit@refon.test', 'SellerTest123!')
  const forbiddenEdit = await request(`/api/listings/${listingId}`, {
    method: 'PUT',
    cookie: otherSeller.cookie,
    body: {
      brand: 'Samsung',
      model: 'Unauthorized Edit',
      year: 2022,
      price: 1,
      batteryPercent: 50,
      storage: '64 GB',
      condition: 'Good',
      color: 'Black',
      conditionNotes: 'This edit must not be accepted by the API.',
      photos: uploadResult.payload.urls,
    },
  })
  assert.equal(forbiddenEdit.response.status, 404)

  const soldResult = await request(`/api/listings/${listingId}/mark-sold`, {
    method: 'PATCH',
    cookie: sellerSession.cookie,
  })
  assert.equal(soldResult.response.status, 200)
  assert.equal(soldResult.payload.listing.status, 'SOLD')
  const storedSold = await prisma.listing.findUniqueOrThrow({ where: { id: listingId } })
  assert.equal(storedSold.status, 'SOLD')

  const soldNotifications = await request('/api/notifications/mine', {
    cookie: inquiryBuyerCookie,
  })
  assert.equal(soldNotifications.response.status, 200)
  const soldNotification = soldNotifications.payload.notifications.find(
    (notification) =>
      notification.relatedListingId === listingId &&
      notification.type === 'LISTING_SOLD',
  )
  assert.ok(soldNotification)
  assert.match(soldNotification.message, /you inquired about has been sold/i)
  createdNotificationIds.push(soldNotification.id)

  const soldDetail = await request(`/api/listings/${listingId}`)
  assert.equal(soldDetail.response.status, 200, JSON.stringify(soldDetail.payload))
  assert.equal(soldDetail.payload.listing.id, listingId)
  assert.equal(soldDetail.payload.listing.status, 'SOLD')

  const soldBrowse = await request(
    `/api/listings?search=${encodeURIComponent(`Galaxy E2E ${testRun}`)}`,
  )
  assert.equal(soldBrowse.response.status, 200)
  assert.equal(soldBrowse.payload.listings.length, 0)

  const soldInquiry = await request(`/api/listings/${listingId}/inquiries`, {
    method: 'POST',
    body: {
      buyerName: 'Late Buyer',
      buyerContact: 'late-buyer@example.test',
      message: 'Is this phone still available after it was marked sold?',
    },
  })
  assert.equal(soldInquiry.response.status, 404)
  assert.equal(soldInquiry.payload.code, 'LISTING_NOT_FOUND')

  const secondCreate = await request('/api/listings', {
    method: 'POST',
    cookie: sellerSession.cookie,
    body: {
      brand: 'OPPO',
      model: `Reno E2E ${testRun}`,
      year: 2022,
      price: 11000,
      batteryPercent: 94,
      storage: '256 GB',
      condition: 'Like New',
      color: 'Black',
      conditionNotes: 'Like-new condition with clean display, frame, and camera lenses.',
      photos: uploadResult.payload.urls,
    },
  })
  assert.equal(secondCreate.response.status, 201)
  const secondId = secondCreate.payload.listing.id
  createdListingIds.push(secondId)

  const rejectResult = await request(`/api/admin/listings/${secondId}/reject`, {
    method: 'PATCH',
    cookie: adminSession.cookie,
    body: { feedback: 'Please add a clearer rear-panel photo.' },
  })
  assert.equal(rejectResult.response.status, 200)
  assert.equal(rejectResult.payload.listing.status, 'REJECTED')

  const rejectionNotifications = await request('/api/notifications/mine', {
    cookie: sellerSession.cookie,
  })
  assert.equal(rejectionNotifications.response.status, 200)
  const rejectionNotification = rejectionNotifications.payload.notifications.find(
    (notification) =>
      notification.relatedListingId === secondId &&
      notification.type === 'LISTING_REJECTED',
  )
  assert.ok(rejectionNotification)
  assert.match(
    rejectionNotification.message,
    /moderator feedback: please add a clearer rear-panel photo\./i,
  )
  createdNotificationIds.push(rejectionNotification.id)

  const markAllResult = await request('/api/notifications/read-all', {
    method: 'PATCH',
    cookie: sellerSession.cookie,
  })
  assert.equal(markAllResult.response.status, 200)
  assert.ok(markAllResult.payload.updatedCount >= 1)
  const readNotifications = await request('/api/notifications/mine', {
    cookie: sellerSession.cookie,
  })
  assert.equal(readNotifications.payload.unreadCount, 0)
  assert.ok(
    readNotifications.payload.notifications
      .filter((notification) => createdNotificationIds.includes(notification.id))
      .every((notification) => notification.isRead),
  )

  const resubmitResult = await request(`/api/listings/${secondId}`, {
    method: 'PUT',
    cookie: sellerSession.cookie,
    body: {
      brand: 'OPPO',
      model: `Reno E2E ${testRun}`,
      year: 2022,
      price: 11000,
      batteryPercent: 94,
      storage: '256 GB',
      condition: 'Like New',
      color: 'Black',
      conditionNotes: 'Updated notes with a clear description of all visible marks.',
      photos: uploadResult.payload.urls,
    },
  })
  assert.equal(resubmitResult.response.status, 200)
  assert.equal(resubmitResult.payload.listing.status, 'PENDING')
  assert.equal(resubmitResult.payload.listing.moderatorFeedback, null)

  const deleteResult = await request(`/api/listings/${secondId}`, {
    method: 'DELETE',
    cookie: sellerSession.cookie,
  })
  assert.equal(deleteResult.response.status, 204)
  createdListingIds = createdListingIds.filter((id) => id !== secondId)

  const buyerEmail = `marketplace-buyer-${testRun}@example.test`
  const buyerRegistration = await request('/api/auth/register', {
    method: 'POST',
    body: {
      name: 'Marketplace Buyer',
      email: buyerEmail,
      password: 'BuyerTest123!',
      role: 'BUYER',
    },
  })
  assert.equal(buyerRegistration.response.status, 201)
  testBuyerId = buyerRegistration.payload.user.id
  const buyerCookie = cookieFrom(buyerRegistration.response)

  const applyResult = await request('/api/sellers/apply', {
    method: 'POST',
    cookie: buyerCookie,
    body: {
      businessName: 'E2E Applied Shop',
      contactInfo: 'applied-shop@example.test · +63 900 000 0000',
    },
  })
  assert.equal(applyResult.response.status, 200)
  testSellerId = applyResult.payload.seller.id
  assert.equal(applyResult.payload.seller.verificationStatus, 'PENDING')
  assert.equal(applyResult.payload.user.role, 'SELLER')

  const refreshedBuyerCookie = cookieFrom(applyResult.response)
  const refreshedProfile = await request('/api/sellers/me', {
    cookie: refreshedBuyerCookie,
  })
  assert.equal(refreshedProfile.response.status, 200)
  assert.equal(refreshedProfile.payload.seller.id, testSellerId)

  const adminCannotApply = await request('/api/sellers/apply', {
    method: 'POST',
    cookie: adminSession.cookie,
    body: {
      businessName: 'Should Not Apply',
      contactInfo: 'admin@example.test',
    },
  })
  assert.equal(adminCannotApply.response.status, 403)

  const pendingSellers = await request('/api/admin/sellers/pending', {
    cookie: adminSession.cookie,
  })
  assert.equal(pendingSellers.response.status, 200)
  assert.ok(pendingSellers.payload.sellers.some((seller) => seller.id === testSellerId))

  const sellerApproval = await request(
    `/api/admin/sellers/${testSellerId}/approve`,
    { method: 'PATCH', cookie: adminSession.cookie },
  )
  assert.equal(sellerApproval.response.status, 200)
  assert.equal(sellerApproval.payload.seller.verificationStatus, 'APPROVED')

  const approvedSellerNotifications = await request('/api/notifications/mine', {
    cookie: refreshedBuyerCookie,
  })
  assert.equal(approvedSellerNotifications.response.status, 200)
  const sellerApprovedNotification = approvedSellerNotifications.payload.notifications.find(
    (notification) => notification.type === 'SELLER_APPROVED',
  )
  assert.ok(sellerApprovedNotification)
  assert.equal(sellerApprovedNotification.relatedListingId, null)
  assert.match(
    sellerApprovedNotification.message,
    /your seller application was approved\. you can now create listings\./i,
  )
  createdNotificationIds.push(sellerApprovedNotification.id)

  const rejectedBuyerEmail = `rejected-buyer-${testRun}@example.test`
  const rejectedBuyerRegistration = await request('/api/auth/register', {
    method: 'POST',
    body: {
      name: 'Rejected E2E Buyer',
      email: rejectedBuyerEmail,
      password: 'BuyerTest123!',
      role: 'BUYER',
    },
  })
  assert.equal(rejectedBuyerRegistration.response.status, 201)
  rejectedBuyerId = rejectedBuyerRegistration.payload.user.id
  const rejectedBuyerCookie = cookieFrom(rejectedBuyerRegistration.response)
  const rejectedApplication = await request('/api/sellers/apply', {
    method: 'POST',
    cookie: rejectedBuyerCookie,
    body: {
      businessName: 'E2E Rejected Shop',
      contactInfo: 'rejected-shop@example.test',
    },
  })
  assert.equal(rejectedApplication.response.status, 200)
  rejectedSellerId = rejectedApplication.payload.seller.id
  const sellerRejection = await request(
    `/api/admin/sellers/${rejectedSellerId}/reject`,
    { method: 'PATCH', cookie: adminSession.cookie },
  )
  assert.equal(sellerRejection.response.status, 200)
  assert.equal(sellerRejection.payload.seller.verificationStatus, 'REJECTED')

  const rejectedSellerNotifications = await request('/api/notifications/mine', {
    cookie: rejectedBuyerCookie,
  })
  assert.equal(rejectedSellerNotifications.response.status, 200)
  const sellerRejectedNotification = rejectedSellerNotifications.payload.notifications.find(
    (notification) => notification.type === 'SELLER_REJECTED',
  )
  assert.ok(sellerRejectedNotification)
  assert.equal(sellerRejectedNotification.relatedListingId, null)
  assert.match(
    sellerRejectedNotification.message,
    /your seller application was rejected\. contact the refon team if you have questions\./i,
  )
  createdNotificationIds.push(sellerRejectedNotification.id)

  const filteredListings = await request(
    '/api/listings?brand=Samsung&minYear=2020&maxYear=2024&minPrice=10000&maxPrice=20000',
  )
  assert.equal(filteredListings.response.status, 200)
  assert.ok(filteredListings.payload.listings.length > 0)
  assert.ok(
    filteredListings.payload.listings.every(
      (listing) =>
        listing.brand === 'Samsung' &&
        listing.year >= 2020 &&
        listing.year <= 2024 &&
        listing.price >= 10000 &&
        listing.price <= 20000,
    ),
  )

  const adminStats = await request('/api/admin/stats', { cookie: adminSession.cookie })
  assert.equal(adminStats.response.status, 200)
  assert.ok(adminStats.payload.stats.totalListings >= 10)
  assert.ok(adminStats.payload.stats.totalSellers >= 5)

  console.log('Marketplace E2E passed:', {
    listingId,
    postgresStatus: storedApproved.status,
    inquiryId: storedInquiry.id,
    inquiryListingId: storedInquiry.listingId,
    notifications: [
      approvalNotification.type,
      inquiryNotification.type,
      rejectionNotification.type,
    ],
    buyerNotifications: [
      inquirySentNotification.type,
      soldNotification.type,
    ],
  })
} finally {
  await prisma.notification.deleteMany({
    where: {
      OR: [
        ...(createdNotificationIds.length > 0
          ? [{ id: { in: createdNotificationIds } }]
          : []),
        { message: { contains: `E2E ${testRun}` } },
        ...(createdListingIds.length > 0
          ? [{ relatedListingId: { in: createdListingIds } }]
          : []),
      ],
    },
  })
  if (createdListingIds.length > 0) {
    await prisma.listing.deleteMany({ where: { id: { in: createdListingIds } } })
  }
  const sellerIdsToDelete = [testSellerId, rejectedSellerId].filter(Boolean)
  if (sellerIdsToDelete.length > 0) {
    await prisma.seller.deleteMany({ where: { id: { in: sellerIdsToDelete } } })
  }
  const buyerIdsToDelete = [
    inquiryBuyerId,
    testBuyerId,
    rejectedBuyerId,
  ].filter(Boolean)
  if (buyerIdsToDelete.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: buyerIdsToDelete } } })
  }
  await Promise.all(
    createdUploadFiles.map((filename) =>
      fs.promises.unlink(path.join(uploadsDirectory, filename)).catch(() => {}),
    ),
  )
  await new Promise((resolve) => server.close(resolve))
  await prisma.$disconnect()
}
