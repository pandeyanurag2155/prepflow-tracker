/**
 * validate({ body, params, query }) parses each part with its zod schema.
 * Parsed values land on req.valid.{body,params,query}; failures reach the error handler as ZodError → 400.
 */
export const validate = schemas => (req, _res, next) => {
  req.valid = {};
  for (const part of ['params', 'query', 'body']) {
    if (schemas[part]) req.valid[part] = schemas[part].parse(req[part] ?? {});
  }
  next();
};
