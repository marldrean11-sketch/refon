import cookieParser from 'cookie-parser'
import cors from 'cors'
import path from 'node:path'
import express from 'express'
import helmet from 'helmet'
import { uploadsDirectory } from './config/uploads.js'
import morgan from 'morgan'
import { env } from './config/env.js'
import { errorHandler, notFoundHandler } from './middlewares/error.middleware.js'
import { health } from './routes/health.routes.js'
import healthCheckRoutes from './routes/health-check.routes.js'
import feedbackRoutes from './routes/feedback.routes.js'
import { serveLocalSeedImage, serveStoredImage } from './controllers/storage.controller.js'
import authRoutes from './routes/auth.routes.js'
import sellerRoutes from './routes/seller.routes.js'
import listingRoutes from './routes/listing.routes.js'
import adminRoutes from './routes/admin.routes.js'
import uploadRoutes from './routes/upload.routes.js'
import notificationRoutes from './routes/notification.routes.js'
import inquiryRoutes from './routes/inquiry.routes.js'
import accountRoutes from './routes/account.routes.js'
import favoriteRoutes from './routes/favorite.routes.js'
import myInquiryRoutes from './routes/my-inquiry.routes.js'
import cartRoutes from './routes/cart.routes.js'
import checkoutRoutes from './routes/checkout.routes.js'
import orderRoutes from './routes/order.routes.js'
import statsRoutes from './routes/stats.routes.js'
import tradeInRoutes from './routes/trade-in.routes.js'
import siteSettingsRoutes from './routes/site-settings.routes.js'

const app = express()

app.disable('x-powered-by')

if (env.isProduction) {
  // Behind a reverse proxy the client IP arrives via X-Forwarded-For, which the
  // rate limiters need in order to key limits per address.
  app.set('trust proxy', env.trustProxy)
}

app.use(
  helmet({
    // helmet's default is same-origin, which would stop listing photos rendering in an
    // <img> tag whenever the frontend and API are served from different origins (the
    // Railway/Render option in the README). Photos are public by design, so images are
    // allowed cross-origin; every other helmet default stays untouched.
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
)
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || env.clientUrls.includes(origin)) {
        return callback(null, true)
      }

      return callback(null, false)
    },
    credentials: true,
  }),
)
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
if (env.storageDriver === 'local') {
  // Unchanged local behaviour: the uploads folder is served straight off disk.
  app.use(
    '/uploads',
    express.static(uploadsDirectory, {
      dotfiles: 'deny',
      fallthrough: true,
      index: false,
      maxAge: '1h',
    }),
  )
} else {
  // With object storage the bucket is private, so the API streams managed photos back
  // out itself. Seed assets are not in the bucket and stay served from local disk.
  app.get('/uploads/seed/:filename', serveLocalSeedImage)
  app.get('/uploads/:filename', serveStoredImage)
}

app.get('/api/health', health)
app.use('/api', (_req, res, next) => {
  res.set('Cache-Control', 'no-store')
  next()
})

if (env.nodeEnv !== 'test') {
  app.use(morgan(env.isProduction ? 'combined' : 'dev'))
}

app.use('/api/auth', authRoutes)
app.use('/api/account', accountRoutes)
app.use('/api/sellers', sellerRoutes)
app.use('/api/listings', listingRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/uploads', uploadRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/inquiries', inquiryRoutes)
app.use('/api/favorites', favoriteRoutes)
app.use('/api/my-inquiries', myInquiryRoutes)
app.use('/api/cart', cartRoutes)
app.use('/api/checkout', checkoutRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/trade-ins', tradeInRoutes)
app.use('/api/health-checks', healthCheckRoutes)
app.use('/api/feedback', feedbackRoutes)
app.use('/api/stats', statsRoutes)
app.use('/api/site-settings', siteSettingsRoutes)

if (env.staticDir) {
  // Single-service deploy: serve the built frontend from the same origin as the API.
  // Vite fingerprints everything under /assets, so it can be cached for a year; the
  // entry HTML must never be cached, or a deploy leaves stale asset references.
  app.use(
    '/assets',
    express.static(path.join(env.staticDir, 'assets'), { immutable: true, maxAge: '1y', index: false }),
  )
  // The service worker script must always be fetched fresh, or a deploy can leave
  // installed copies of the app running old code.
  app.get('/sw.js', (_req, res) => {
    res.set('Cache-Control', 'no-cache')
    res.sendFile(path.join(env.staticDir, 'sw.js'))
  })
  app.use(express.static(env.staticDir, { index: false, maxAge: '1h' }))
  // Client-side routing: any other GET outside /api and /uploads is a React route.
  app.get(/^\/(?!api\/|uploads\/).*/, (_req, res) => {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    res.sendFile(path.join(env.staticDir, 'index.html'))
  })
}

app.use(notFoundHandler)
app.use(errorHandler)

export default app
