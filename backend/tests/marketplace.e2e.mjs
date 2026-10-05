import assert from 'node:assert/strict'

process.env.NODE_ENV = 'test'

const testRun = Date.now()
const { default: app } = await import(
  new URL(`../src/app.js?marketplace-e2e=${testRun}`, import.meta.url)
)
const { prisma } = await import(
  new URL(`../src/config/prisma.js?marketplace-e2e=${testRun}`, import.meta.url)
)
const { storage } = await import(
  new URL(`../src/services/storage.service.js?marketplace-e2e=${testRun}`, import.meta.url)
)

const testPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
)

// Not an image at all, but declared as one: the magic-byte check must catch this.
const disguisedText = Buffer.from(
  '<?php echo "this is not a png"; ?> and some more text to pad the buffer out.',
  'utf8',
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
let otherBuyerId

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
    // Seed illustrations are served from local disk on every driver.
    assert.equal(staticResponse.headers.get('x-content-type-options'), 'nosniff')
  }

  const seedAssetResponse = await fetch(`${baseUrl}/uploads/seed/phone-front.svg`)
  assert.equal(seedAssetResponse.status, 200)
  assert.match(seedAssetResponse.headers.get('content-type') ?? '', /image\/svg\+xml/)

  // The filename guard must reject anything that is not a managed listing upload.
  for (const rejectedPath of [
    '/uploads/seed/../.env',
    '/uploads/not-a-managed-name.png',
    '/uploads/1-2.png',
  ]) {
    const rejected = await fetch(`${baseUrl}${rejectedPath}`)
    assert.ok(
      rejected.status === 404 || rejected.status === 400,
      `${rejectedPath} must not be served (got ${rejected.status})`,
    )
  }

  // A file that lies about being a PNG is rejected on its bytes, not its header.
  const disguisedForm = new FormData()
  disguisedForm.append(
    'photos',
    new Blob([disguisedText], { type: 'image/png' }),
    'not-really.png',
  )
  const disguisedResult = await fetch(`${baseUrl}/api/uploads`, {
    method: 'POST',
    headers: { Cookie: sellerSession.cookie },
    body: disguisedForm,
  })
  assert.equal(disguisedResult.status, 422)
  assert.equal((await disguisedResult.json()).code, 'INVALID_PHOTO_UPLOAD')

  const storageFilesAfterReject = await storage.list()
  assert.equal(
    storageFilesAfterReject.some((file) => file.filename === 'not-really.png'),
    false,
    'a rejected upload must not leave a stored object behind',
  )

  const healthResponse = await request('/api/health')
  assert.equal(healthResponse.response.status, 200)
  assert.equal(healthResponse.payload.status, 'ok')
  assert.equal(typeof healthResponse.payload.uptime, 'number')
  assert.ok(healthResponse.payload.uptime >= 0)

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
  assert.equal(sellerInquiries.payload.inquiries[0].isRead, false)

  const anonymousInquiry = await request(`/api/listings/${listingId}/inquiries`, {
    method: 'POST',
    body: {
      buyerName: 'Guest Buyer',
      buyerContact: 'guest-buyer@example.test',
      message: 'I am interested while browsing as a guest.',
    },
  })
  assert.equal(anonymousInquiry.response.status, 201)

  const otherSeller = await login('circuit@refon.test', 'SellerTest123!')

  // --- Buyer features: saved listings + buyer inquiry history ---
  const otherBuyerEmail = `other-buyer-${testRun}@example.test`
  const otherBuyerRegistration = await request('/api/auth/register', {
    method: 'POST',
    body: {
      name: 'Other Buyer',
      email: otherBuyerEmail,
      password: 'BuyerTest123!',
      role: 'BUYER',
    },
  })
  assert.equal(otherBuyerRegistration.response.status, 201)
  otherBuyerId = otherBuyerRegistration.payload.user.id
  const otherBuyerCookie = cookieFrom(otherBuyerRegistration.response)

  const otherBuyerInquiryResult = await request(
    `/api/listings/${listingId}/inquiries`,
    {
      method: 'POST',
      cookie: otherBuyerCookie,
      body: {
        buyerName: 'Other Buyer',
        buyerContact: 'other-buyer@example.test',
        message: 'Would you consider a lower offer for this handset?',
      },
    },
  )
  assert.equal(otherBuyerInquiryResult.response.status, 201)
  const otherBuyerInquiryId = otherBuyerInquiryResult.payload.inquiry.id

  const myInquiries = await request('/api/my-inquiries', {
    cookie: inquiryBuyerCookie,
  })
  assert.equal(myInquiries.response.status, 200)
  const myInquiryIds = myInquiries.payload.inquiries.map((inquiry) => inquiry.id)
  assert.ok(myInquiryIds.includes(inquiryId))
  assert.equal(myInquiryIds.includes(otherBuyerInquiryId), false)
  // The guest inquiry has no buyerId and must never leak into a buyer history.
  assert.equal(
    myInquiryIds.includes(anonymousInquiry.payload.inquiry.id),
    false,
  )
  const myInquiry = myInquiries.payload.inquiries.find(
    (inquiry) => inquiry.id === inquiryId,
  )
  assert.equal(myInquiry.listingId, listingId)
  assert.equal(myInquiry.listing.id, listingId)
  assert.equal(myInquiry.listing.status, 'APPROVED')
  assert.equal(typeof myInquiry.listing.price, 'number')
  assert.equal(typeof myInquiry.buyerContact, 'string')
  // Seller contact details are never part of the buyer payload.
  assert.equal(myInquiry.listing.contactInfo, undefined)

  const otherBuyerInquiries = await request('/api/my-inquiries', {
    cookie: otherBuyerCookie,
  })
  assert.equal(otherBuyerInquiries.response.status, 200)
  const otherBuyerInquiryIds = otherBuyerInquiries.payload.inquiries.map(
    (inquiry) => inquiry.id,
  )
  assert.ok(otherBuyerInquiryIds.includes(otherBuyerInquiryId))
  assert.equal(otherBuyerInquiryIds.includes(inquiryId), false)

  // Sellers keep read access to their own inquiry history, which starts empty.
  const sellerMyInquiries = await request('/api/my-inquiries', {
    cookie: otherSeller.cookie,
  })
  assert.equal(sellerMyInquiries.response.status, 200)
  assert.deepEqual(sellerMyInquiries.payload.inquiries, [])

  const anonymousMyInquiries = await request('/api/my-inquiries')
  assert.equal(anonymousMyInquiries.response.status, 401)

  const anonymousFavorites = await request('/api/favorites/mine')
  assert.equal(anonymousFavorites.response.status, 401)

  const anonymousSave = await request(`/api/favorites/${listingId}`, {
    method: 'PUT',
  })
  assert.equal(anonymousSave.response.status, 401)

  const sellerSave = await request(`/api/favorites/${listingId}`, {
    method: 'PUT',
    cookie: otherSeller.cookie,
  })
  assert.equal(sellerSave.response.status, 403)
  assert.equal(sellerSave.payload.code, 'FORBIDDEN')

  const saveFavorite = await request(`/api/favorites/${listingId}`, {
    method: 'PUT',
    cookie: inquiryBuyerCookie,
  })
  assert.equal(saveFavorite.response.status, 200)
  assert.equal(saveFavorite.payload.saved, true)

  const savedTwice = await request(`/api/favorites/${listingId}`, {
    method: 'PUT',
    cookie: inquiryBuyerCookie,
  })
  assert.equal(savedTwice.response.status, 200)
  assert.equal(savedTwice.payload.saved, true)

  const favoriteRows = await prisma.favorite.count({
    where: { userId: inquiryBuyerId, listingId },
  })
  assert.equal(favoriteRows, 1)

  const myFavorites = await request('/api/favorites/mine', {
    cookie: inquiryBuyerCookie,
  })
  assert.equal(myFavorites.response.status, 200)
  assert.ok(myFavorites.payload.ids.includes(listingId))
  const savedListing = myFavorites.payload.listings.find(
    (listing) => listing.id === listingId,
  )
  assert.ok(savedListing)
  assert.equal(savedListing.status, 'APPROVED')
  assert.equal(typeof savedListing.savedAt, 'string')

  const sellerFavorites = await request('/api/favorites/mine', {
    cookie: otherSeller.cookie,
  })
  assert.equal(sellerFavorites.response.status, 200)
  assert.equal(sellerFavorites.payload.ids.includes(listingId), false)

  // --- Seller inquiry inbox ---
  const inboxBeforeRead = await request('/api/inquiries/mine', {
    cookie: sellerSession.cookie,
  })
  assert.equal(inboxBeforeRead.response.status, 200)
  assert.ok(inboxBeforeRead.payload.unreadCount >= 1)

  const inboxInquiry = inboxBeforeRead.payload.inquiries.find(
    (inquiry) => inquiry.id === inquiryId,
  )
  assert.ok(inboxInquiry)
  assert.equal(inboxInquiry.isRead, false)
  assert.equal(inboxInquiry.listingId, listingId)
  assert.equal(inboxInquiry.listing.id, listingId)
  assert.equal(inboxInquiry.listing.status, 'APPROVED')
  assert.equal(typeof inboxInquiry.listing.price, 'number')
  assert.ok(inboxInquiry.listing.mainPhoto === null || typeof inboxInquiry.listing.mainPhoto === 'string')

  const unreadOnly = await request('/api/inquiries/mine?status=unread', {
    cookie: sellerSession.cookie,
  })
  assert.equal(unreadOnly.response.status, 200)
  assert.ok(unreadOnly.payload.inquiries.every((inquiry) => inquiry.isRead === false))
  // The badge count must ignore the filters, so it matches the unfiltered total.
  assert.equal(unreadOnly.payload.unreadCount, inboxBeforeRead.payload.unreadCount)

  const filteredByListing = await request(
    `/api/inquiries/mine?listingId=${listingId}`,
    { cookie: sellerSession.cookie },
  )
  assert.equal(filteredByListing.response.status, 200)
  assert.ok(filteredByListing.payload.inquiries.every((inquiry) => inquiry.listingId === listingId))
  assert.equal(filteredByListing.payload.unreadCount, inboxBeforeRead.payload.unreadCount)

  const otherSellerInbox = await request('/api/inquiries/mine', {
    cookie: otherSeller.cookie,
  })
  assert.equal(otherSellerInbox.response.status, 200)
  assert.ok(
    !otherSellerInbox.payload.inquiries.some((inquiry) => inquiry.id === inquiryId),
  )
  assert.equal(
    otherSellerInbox.payload.inquiries.some((inquiry) => inquiry.listingId === listingId),
    false,
  )

  const crossSellerRead = await request(`/api/inquiries/${inquiryId}/read`, {
    method: 'PATCH',
    cookie: otherSeller.cookie,
  })
  assert.equal(crossSellerRead.response.status, 404)
  assert.equal(crossSellerRead.payload.code, 'INQUIRY_NOT_FOUND')

  const buyerInbox = await request('/api/inquiries/mine', {
    cookie: inquiryBuyerCookie,
  })
  assert.equal(buyerInbox.response.status, 403)
  assert.equal(buyerInbox.payload.code, 'FORBIDDEN')

  const anonymousInbox = await request('/api/inquiries/mine')
  assert.equal(anonymousInbox.response.status, 401)

  const unreadBeforeMark = (
    await request('/api/inquiries/mine', { cookie: sellerSession.cookie })
  ).payload.unreadCount

  const ownerReadResult = await request(`/api/inquiries/${inquiryId}/read`, {
    method: 'PATCH',
    cookie: sellerSession.cookie,
  })
  assert.equal(ownerReadResult.response.status, 200)
  assert.equal(ownerReadResult.payload.inquiry.isRead, true)

  const afterOwnerRead = await request('/api/inquiries/mine', {
    cookie: sellerSession.cookie,
  })
  assert.equal(afterOwnerRead.payload.unreadCount, unreadBeforeMark - 1)
  assert.equal(
    afterOwnerRead.payload.inquiries.find((inquiry) => inquiry.id === inquiryId).isRead,
    true,
  )

  const storedReadInquiry = await prisma.inquiry.findUniqueOrThrow({
    where: { id: inquiryId },
  })
  assert.equal(storedReadInquiry.isRead, true)

  const readAllResult = await request('/api/inquiries/read-all', {
    method: 'PATCH',
    cookie: sellerSession.cookie,
  })
  assert.equal(readAllResult.response.status, 200)
  assert.ok(readAllResult.payload.updatedCount >= 1)

  const afterReadAll = await request('/api/inquiries/mine', {
    cookie: sellerSession.cookie,
  })
  assert.equal(afterReadAll.payload.unreadCount, 0)
  assert.ok(afterReadAll.payload.inquiries.every((inquiry) => inquiry.isRead === true))

  const crossSellerAfterReadAll = await request('/api/inquiries/mine', {
    cookie: otherSeller.cookie,
  })
  assert.ok(
    !crossSellerAfterReadAll.payload.inquiries.some(
      (inquiry) => inquiry.id === inquiryId,
    ),
  )

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

  // --- Listing reports ---
  const anonymousReport = await request(`/api/listings/${listingId}/reports`, {
    method: 'POST',
    body: { reason: 'SCAM' },
  })
  assert.equal(anonymousReport.response.status, 401)

  const adminReport = await request(`/api/listings/${listingId}/reports`, {
    method: 'POST',
    cookie: adminSession.cookie,
    body: { reason: 'SCAM' },
  })
  assert.equal(adminReport.response.status, 403)

  const ownListingReport = await request(`/api/listings/${listingId}/reports`, {
    method: 'POST',
    cookie: sellerSession.cookie,
    body: { reason: 'SCAM' },
  })
  assert.equal(ownListingReport.response.status, 403)
  assert.equal(ownListingReport.payload.code, 'CANNOT_REPORT_OWN_LISTING')

  const otherRequiresDetails = await request(`/api/listings/${listingId}/reports`, {
    method: 'POST',
    cookie: otherBuyerCookie,
    body: { reason: 'OTHER' },
  })
  assert.equal(otherRequiresDetails.response.status, 422)
  assert.match(otherRequiresDetails.payload.errors.details, /add details/i)

  const firstReport = await request(`/api/listings/${listingId}/reports`, {
    method: 'POST',
    cookie: inquiryBuyerCookie,
    body: { reason: 'MISLEADING', details: 'The photos show a different handset.' },
  })
  assert.equal(firstReport.response.status, 201, JSON.stringify(firstReport.payload))
  assert.equal(firstReport.payload.report.status, 'OPEN')
  assert.equal(typeof firstReport.payload.report.createdAt, 'string')
  // The reporter's identity is never echoed back.
  assert.equal(firstReport.payload.report.reporterId, undefined)
  assert.equal(firstReport.payload.report.reporter, undefined)
  const firstReportId = firstReport.payload.report.id

  const duplicateReport = await request(`/api/listings/${listingId}/reports`, {
    method: 'POST',
    cookie: inquiryBuyerCookie,
    body: { reason: 'SCAM' },
  })
  assert.equal(duplicateReport.response.status, 409)
  assert.equal(duplicateReport.payload.code, 'ALREADY_REPORTED')

  const secondReport = await request(`/api/listings/${listingId}/reports`, {
    method: 'POST',
    cookie: otherBuyerCookie,
    body: { reason: 'OTHER', details: 'Seller refuses to meet locally.' },
  })
  assert.equal(secondReport.response.status, 201)
  const secondReportId = secondReport.payload.report.id

  const unknownListingReport = await request(
    '/api/listings/00000000-0000-0000-0000-000000000000/reports',
    { method: 'POST', cookie: inquiryBuyerCookie, body: { reason: 'SCAM' } },
  )
  assert.equal(unknownListingReport.response.status, 404)

  const invalidReasonReport = await request(`/api/listings/${listingId}/reports`, {
    method: 'POST',
    cookie: inquiryBuyerCookie,
    body: { reason: 'NONSENSE' },
  })
  assert.equal(invalidReasonReport.response.status, 422)

  const buyerReportsList = await request('/api/admin/reports', {
    cookie: inquiryBuyerCookie,
  })
  assert.equal(buyerReportsList.response.status, 403)

  const sellerReportsList = await request('/api/admin/reports', {
    cookie: otherSeller.cookie,
  })
  assert.equal(sellerReportsList.response.status, 403)

  const adminReports = await request('/api/admin/reports?status=OPEN', {
    cookie: adminSession.cookie,
  })
  assert.equal(adminReports.response.status, 200)
  const listedReport = adminReports.payload.reports.find(
    (report) => report.id === firstReportId,
  )
  assert.ok(listedReport)
  assert.equal(listedReport.reason, 'MISLEADING')
  assert.equal(listedReport.reporter.id, inquiryBuyerId)
  assert.equal(typeof listedReport.reporter.email, 'string')
  assert.equal(listedReport.listing.id, listingId)
  assert.equal(listedReport.listing.status, 'APPROVED')
  assert.equal(typeof listedReport.listing.price, 'number')
  assert.equal(typeof listedReport.listing.sellerName, 'string')
  // Both reports on this listing are still open.
  assert.equal(listedReport.openReportsForListing, 2)

  const statsWithReports = await request('/api/admin/stats', {
    cookie: adminSession.cookie,
  })
  assert.equal(statsWithReports.response.status, 200)
  assert.ok(statsWithReports.payload.stats.openReports >= 2)

  const takeDownWithoutNote = await request(
    `/api/admin/reports/${firstReportId}/resolve`,
    { method: 'PATCH', cookie: adminSession.cookie, body: { action: 'TAKE_DOWN' } },
  )
  assert.equal(takeDownWithoutNote.response.status, 422)
  assert.match(takeDownWithoutNote.payload.errors.note, /why this listing/i)

  const invalidAction = await request(
    `/api/admin/reports/${firstReportId}/resolve`,
    { method: 'PATCH', cookie: adminSession.cookie, body: { action: 'DELETE_EVERYWHERE' } },
  )
  assert.equal(invalidAction.response.status, 422)

  // DISMISS leaves the live listing untouched and still tells the reporter.
  const dismissResult = await request(
    `/api/admin/reports/${secondReportId}/resolve`,
    {
      method: 'PATCH',
      cookie: adminSession.cookie,
      body: { action: 'DISMISS', note: 'Photos matched the description.' },
    },
  )
  assert.equal(dismissResult.response.status, 200)

  const dismissedListing = await request(`/api/listings/${listingId}`)
  assert.equal(dismissedListing.payload.listing.status, 'APPROVED')

  const reporterAfterDismiss = await request('/api/notifications/mine', {
    cookie: otherBuyerCookie,
  })
  const dismissNotification = reporterAfterDismiss.payload.notifications.find(
    (notification) => notification.type === 'REPORT_RESOLVED',
  )
  assert.ok(dismissNotification)
  assert.match(dismissNotification.message, /found no violation/i)
  createdNotificationIds.push(dismissNotification.id)

  const resolveDismissed = await request(
    `/api/admin/reports/${secondReportId}/resolve`,
    { method: 'PATCH', cookie: adminSession.cookie, body: { action: 'RESOLVE' } },
  )
  assert.equal(resolveDismissed.response.status, 409)
  assert.equal(resolveDismissed.payload.code, 'REPORT_ALREADY_RESOLVED')

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

  // A saved listing stays in the buyer's list once it sells.
  const favoritesAfterSold = await request('/api/favorites/mine', {
    cookie: inquiryBuyerCookie,
  })
  assert.equal(favoritesAfterSold.response.status, 200)
  assert.ok(favoritesAfterSold.payload.ids.includes(listingId))
  assert.equal(
    favoritesAfterSold.payload.listings.find(
      (listing) => listing.id === listingId,
    ).status,
    'SOLD',
  )

  const removeFavorite = await request(`/api/favorites/${listingId}`, {
    method: 'DELETE',
    cookie: inquiryBuyerCookie,
  })
  assert.equal(removeFavorite.response.status, 204)

  const removedTwice = await request(`/api/favorites/${listingId}`, {
    method: 'DELETE',
    cookie: inquiryBuyerCookie,
  })
  assert.equal(removedTwice.response.status, 204)

  const favoritesAfterRemove = await request('/api/favorites/mine', {
    cookie: inquiryBuyerCookie,
  })
  assert.equal(favoritesAfterRemove.payload.ids.includes(listingId), false)
  assert.equal(
    favoritesAfterRemove.payload.listings.some(
      (listing) => listing.id === listingId,
    ),
    false,
  )
  assert.equal(
    await prisma.favorite.count({ where: { userId: inquiryBuyerId, listingId } }),
    0,
  )

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

  // A sold listing is off the market, so it can no longer be taken down.
  const takeDownSold = await request(
    `/api/admin/reports/${firstReportId}/resolve`,
    {
      method: 'PATCH',
      cookie: adminSession.cookie,
      body: { action: 'TAKE_DOWN', note: 'Reported as a scam listing.' },
    },
  )
  assert.equal(takeDownSold.response.status, 409)
  assert.equal(takeDownSold.payload.code, 'LISTING_NOT_TAKEDOWN_ELIGIBLE')

  const stillSold = await request(`/api/listings/${listingId}`)
  assert.equal(stillSold.payload.listing.status, 'SOLD')

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
  assert.equal(secondCreate.payload.listing.status, 'PENDING')
  createdListingIds.push(secondId)

  // Listings still in moderation cannot be reported.
  const reportPending = await request(`/api/listings/${secondId}/reports`, {
    method: 'POST',
    cookie: inquiryBuyerCookie,
    body: { reason: 'SCAM' },
  })
  assert.equal(reportPending.response.status, 404)
  assert.equal(reportPending.payload.code, 'LISTING_NOT_FOUND')

  // --- Successful take-down on a dedicated listing ---
  const reportedCreate = await request('/api/listings', {
    method: 'POST',
    cookie: sellerSession.cookie,
    body: {
      brand: 'Xiaomi',
      model: `Reported E2E ${testRun}`,
      year: 2020,
      price: 7500,
      batteryPercent: 70,
      storage: '64 GB',
      condition: 'Good',
      color: 'Red',
      conditionNotes: 'Condition notes long enough for validation to pass.',
      photos: uploadResult.payload.urls,
    },
  })
  assert.equal(reportedCreate.response.status, 201, JSON.stringify(reportedCreate.payload))
  const reportedListingId = reportedCreate.payload.listing.id
  createdListingIds.push(reportedListingId)

  const approveReported = await request(
    `/api/admin/listings/${reportedListingId}/approve`,
    { method: 'PATCH', cookie: adminSession.cookie },
  )
  assert.equal(approveReported.response.status, 200)

  const reportedResult = await request(`/api/listings/${reportedListingId}/reports`, {
    method: 'POST',
    cookie: inquiryBuyerCookie,
    body: { reason: 'PROHIBITED_ITEM', details: 'Stolen device.' },
  })
  assert.equal(reportedResult.response.status, 201)
  const reportedId = reportedResult.payload.report.id

  const takeDownResult = await request(`/api/admin/reports/${reportedId}/resolve`, {
    method: 'PATCH',
    cookie: adminSession.cookie,
    body: {
      action: 'TAKE_DOWN',
      note: 'Device reported stolen; listing removed pending police report.',
    },
  })
  assert.equal(takeDownResult.response.status, 200)

  // A REJECTED listing is no longer publicly readable, so verify through Prisma.
  const takenDownDetail = await request(`/api/listings/${reportedListingId}`)
  assert.equal(takenDownDetail.response.status, 404)

  const takenDownRow = await prisma.listing.findUniqueOrThrow({
    where: { id: reportedListingId },
  })
  assert.equal(takenDownRow.status, 'REJECTED')
  assert.equal(
    takenDownRow.moderatorFeedback,
    'Device reported stolen; listing removed pending police report.',
  )

  const sellerTakeDownNotifications = await request('/api/notifications/mine', {
    cookie: sellerSession.cookie,
  })
  const takeDownNotification = sellerTakeDownNotifications.payload.notifications.find(
    (notification) =>
      notification.type === 'LISTING_TAKEN_DOWN' &&
      notification.relatedListingId === reportedListingId,
  )
  assert.ok(takeDownNotification)
  assert.match(takeDownNotification.message, /taken down after a buyer report/i)
  assert.match(takeDownNotification.message, /reported stolen/i)
  createdNotificationIds.push(takeDownNotification.id)

  const reporterTakeDownNotifications = await request('/api/notifications/mine', {
    cookie: inquiryBuyerCookie,
  })
  const reporterTakeDownNotification =
    reporterTakeDownNotifications.payload.notifications.find(
      (notification) =>
        notification.type === 'REPORT_RESOLVED' &&
        notification.message.includes('removed the listing'),
    )
  assert.ok(reporterTakeDownNotification)
  createdNotificationIds.push(reporterTakeDownNotification.id)

  const reResolveTakenDown = await request(
    `/api/admin/reports/${reportedId}/resolve`,
    { method: 'PATCH', cookie: adminSession.cookie, body: { action: 'RESOLVE' } },
  )
  assert.equal(reResolveTakenDown.response.status, 409)

  const resolvedQueue = await request('/api/admin/reports?status=RESOLVED', {
    cookie: adminSession.cookie,
  })
  assert.equal(resolvedQueue.response.status, 200)
  assert.ok(
    resolvedQueue.payload.reports.some((report) => report.id === reportedId),
  )

  // Listings still in moderation cannot be saved.
  const savePendingFavorite = await request(`/api/favorites/${secondId}`, {
    method: 'PUT',
    cookie: inquiryBuyerCookie,
  })
  assert.equal(savePendingFavorite.response.status, 404)
  assert.equal(savePendingFavorite.payload.code, 'LISTING_NOT_FOUND')

  const saveMissingFavorite = await request(
    '/api/favorites/00000000-0000-0000-0000-000000000000',
    { method: 'PUT', cookie: inquiryBuyerCookie },
  )
  assert.equal(saveMissingFavorite.response.status, 404)

  const saveInvalidFavorite = await request('/api/favorites/not-a-uuid', {
    method: 'PUT',
    cookie: inquiryBuyerCookie,
  })
  assert.equal(saveInvalidFavorite.response.status, 422)

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
    {
      method: 'PATCH',
      cookie: adminSession.cookie,
      body: { feedback: 'Business registration could not be verified.' },
    },
  )
  assert.equal(sellerRejection.response.status, 200)
  assert.equal(sellerRejection.payload.seller.verificationStatus, 'REJECTED')
  assert.equal(
    sellerRejection.payload.seller.moderatorFeedback,
    'Business registration could not be verified.',
  )

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
  assert.match(
    sellerRejectedNotification.message,
    /reason: business registration could not be verified\./i,
  )
  createdNotificationIds.push(sellerRejectedNotification.id)

  const rejectedProfile = await request('/api/sellers/me', {
    cookie: rejectedBuyerCookie,
  })
  assert.equal(rejectedProfile.payload.seller.moderatorFeedback,
    'Business registration could not be verified.')

  // Re-applying clears the stale rejection reason.
  const rejectedReapply = await request('/api/sellers/apply', {
    method: 'POST',
    cookie: rejectedBuyerCookie,
    body: {
      businessName: 'E2E Rejected Shop',
      contactInfo: 'rejected-shop@example.test',
    },
  })
  assert.equal(rejectedReapply.response.status, 200)
  assert.equal(rejectedReapply.payload.seller.verificationStatus, 'PENDING')
  assert.equal(rejectedReapply.payload.seller.moderatorFeedback, null)

  const clearedFeedbackSeller = await prisma.seller.findUniqueOrThrow({
    where: { id: rejectedSellerId },
  })
  assert.equal(clearedFeedbackSeller.moderatorFeedback, null)

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
    otherBuyerId,
  ].filter(Boolean)
  if (buyerIdsToDelete.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: buyerIdsToDelete } } })
  }
  await Promise.all(
    createdUploadFiles.map((filename) => storage.remove(filename).catch(() => {})),
  )
  await new Promise((resolve) => server.close(resolve))
  await prisma.$disconnect()
}
