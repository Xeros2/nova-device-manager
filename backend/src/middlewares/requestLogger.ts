import { Request, Response, NextFunction } from 'express';

/**
 * Request logging middleware
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  
  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - start;
    const log = `${req.method} ${req.path} ${res.statusCode} - ${duration}ms`;
    
    if (res.statusCode >= 500) {
      console.error(`[HTTP] ${log}`);
    } else if (res.statusCode >= 400) {
      console.warn(`[HTTP] ${log}`);
    } else {
      console.log(`[HTTP] ${log}`);
    }
  });

  next();
}
