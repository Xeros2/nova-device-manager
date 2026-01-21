import { Router } from 'express';
import deviceRoutes from './device.routes';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Device routes
router.use('/device', deviceRoutes);

export default router;
