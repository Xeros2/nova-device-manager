import { Router } from 'express';
import { handleRegister, handleStatus } from '../controllers/device.controller';

const router = Router();

/**
 * POST /api/device/register
 * Register a new device or return status for existing device
 */
router.post('/register', handleRegister);

/**
 * POST /api/device/status
 * Check device status
 */
router.post('/status', handleStatus);

export default router;
