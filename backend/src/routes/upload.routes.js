import { Router } from 'express'
import { uploadPhotos } from '../controllers/upload.controller.js'
import { uploadPhotoFiles } from '../config/uploads.js'
import { authenticate, requireSeller } from '../middlewares/auth.middleware.js'

const router = Router()

router.post('/', authenticate, requireSeller, uploadPhotoFiles, uploadPhotos)
router.post('/photos', authenticate, requireSeller, uploadPhotoFiles, uploadPhotos)

export default router
