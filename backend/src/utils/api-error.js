export class ApiError extends Error {
  constructor(statusCode, message, code = 'API_ERROR', details) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.code = code
    this.details = details
  }
}
