import { validationError } from '../errors/application-error.js';

const REQUEST_LOCATIONS = ['body', 'params', 'query'];
const MAX_VALIDATION_DETAILS = 20;
const MAX_PATH_SEGMENTS = 20;
const MAX_PATH_STRING_LENGTH = 100;
const MAX_MESSAGE_LENGTH = 500;

function safePath(path) {
  return path.slice(0, MAX_PATH_SEGMENTS).map((segment) => {
    if (typeof segment === 'string') {
      return segment.slice(0, MAX_PATH_STRING_LENGTH);
    }

    if (typeof segment === 'number') return segment;

    return String(segment).slice(0, MAX_PATH_STRING_LENGTH);
  });
}

function safeValidationDetails(issues) {
  return issues.slice(0, MAX_VALIDATION_DETAILS).map((issue) => ({
    path: safePath(issue.path),
    message: String(issue.message).slice(0, MAX_MESSAGE_LENGTH),
  }));
}

/**
 * Parse the selected HTTP request locations and expose only the parsed result
 * to downstream handlers through request.validated.
 *
 * Schemas are intentionally endpoint-owned. They decide coercion and whether
 * unknown object keys are stripped, rejected, or passed through.
 */
export function validateRequest({ body, params, query } = {}) {
  const schemas = { body, params, query };

  return function requestValidationMiddleware(request, _response, next) {
    const validated = {};

    try {
      for (const location of REQUEST_LOCATIONS) {
        const schema = schemas[location];

        if (schema === undefined) continue;

        const result = schema.safeParse(request[location]);

        if (!result.success) {
          return next(
            validationError(
              undefined,
              safeValidationDetails(result.error.issues),
            ),
          );
        }

        validated[location] = result.data;
      }
    } catch (error) {
      return next(error);
    }

    request.validated = validated;
    return next();
  };
}
