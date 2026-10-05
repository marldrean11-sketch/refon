import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { uploadsDirectory } from './config/uploads.js'
import morgan from 'morgan'
import { env } from './config/env.js'
import { errorHandler, notFoundHandler } from './middlewares/error.middleware.js'
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

const app = express()

app.disable('x-powered-by')

if (env.isProduction) {
  // Behind a reverse proxy the client IP arrives via X-Forwarded-For, which the
  // rate limiters need in order to key limits per address.
  app.set('trust proxy', 1)
}

app.use(helmet())
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
app.use(
  '/uploads',
  express.static(uploadsDirectory, {
    dotfiles: 'deny',
    fallthrough: true,
    index: false,
    maxAge: '1h',
  }),
)
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
app.use(notFoundHandler)
app.use(errorHandler)

export default app
