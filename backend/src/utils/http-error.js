/** Error with an HTTP status and a stable machine-readable code; rendered by middlewares/error-handler.js. */
export class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message, details) { return new HttpError(400, 'BAD_REQUEST', message, details); }
  static notFound(what = 'Resource') { return new HttpError(404, 'NOT_FOUND', `${what} not found`); }
  static conflict(message) { return new HttpError(409, 'CONFLICT', message); }
}
