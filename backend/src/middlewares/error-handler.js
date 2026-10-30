import { ZodError } from 'zod';
import { HttpError } from '../utils/http-error.js';

// Postgres error codes we can explain to the client instead of answering 500
const PG_ERRORS = {
  '22P02': [400, 'BAD_REQUEST', 'Malformed value'],
  '23503': [400, 'BAD_REQUEST', 'Referenced record does not exist'],
  '23505': [409, 'CONFLICT', 'Record already exists'],
  '23514': [400, 'BAD_REQUEST', 'Value violates a constraint'],
};

export function notFound(req, _res, next) {
  next(new HttpError(404, 'ROUTE_NOT_FOUND', `No route for ${req.method} ${req.originalUrl}`));
}

/** Every error leaves as { error: { code, message, details? } }. */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  let status = 500;
  let body = { code: 'INTERNAL', message: 'Something went wrong' };

  if (err instanceof HttpError) {
    status = err.status;
    body = { code: err.code, message: err.message, details: err.details };
  } else if (err instanceof ZodError) {
    status = 400;
    body = {
      code: 'VALIDATION_ERROR',
      message: 'Request is invalid',
      details: err.issues.map(i => ({ path: i.path.join('.'), message: i.message })),
    };
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    body = { code: 'BAD_JSON', message: 'Body is not valid JSON' };
  } else if (err.type === 'entity.too.large') {
    status = 413;
    body = { code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large' };
  } else if (PG_ERRORS[err.code]) {
    const [s, code, message] = PG_ERRORS[err.code];
    status = s;
    body = { code, message };
  }

  if (status >= 500) req.log.error({ err }, 'request failed');
  else req.log.warn({ code: body.code, msg: body.message }, 'request rejected');
  res.status(status).json({ error: body });
}
