const express = require('express');
const router = express.Router();
const { simulatePayment, simulateShippingCreate, simulateShippingUpdate } = require('../controllers/integrationController');
const { authMiddleware } = require('../middleware/auth.middleware');

// Note: integration endpoints expect x-api-key and Authorization headers
router.post('/payments/simulate', simulatePayment);
router.post('/shipping/create', simulateShippingCreate);
router.post('/shipping/update', simulateShippingUpdate);

module.exports = router;
