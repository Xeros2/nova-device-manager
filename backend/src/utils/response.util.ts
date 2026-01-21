import { Response } from 'express';

/**
 * Standard success response
 */
export function success<T>(res: Response, data: T, statusCode = 200): Response {
  return res.status(statusCode).json(data);
}

/**
 * Standard error response
 */
export function error(
  res: Response, 
  message: string, 
  statusCode = 500, 
  details?: unknown
): Response {
  const response: { error: string; details?: unknown } = { error: message };
  
  if (details && process.env.NODE_ENV === 'development') {
    response.details = details;
  }
  
  return res.status(statusCode).json(response);
}

/**
 * Not found response
 */
export function notFound(res: Response, resource = 'Resource'): Response {
  return error(res, `${resource} not found`, 404);
}

/**
 * Bad request response
 */
export function badRequest(res: Response, message: string): Response {
  return error(res, message, 400);
}
