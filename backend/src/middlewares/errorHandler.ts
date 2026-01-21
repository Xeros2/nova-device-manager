import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

/**
 * Global error handling middleware
 */
export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  console.error(`[Error] ${req.method} ${req.path}:`, err);

  res.status(statusCode).json({
    error: message,
    ...(env.NODE_ENV === 'development' && {
      stack: err.stack,
      details: err,
    }),
  });
}

/**
 * Handle 404 - Route not found
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
    method: req.method,
  });
}
