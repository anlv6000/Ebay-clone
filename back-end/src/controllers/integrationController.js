const logger = require('../utils/logger');
const { processPayment, validateIntegrationAuth } = require('../services/simulatedPaymentService');
const { createShipment, updateShipmentStatus } = require('../services/simulatedShippingService');

// POST /integrations/payments/simulate
const simulatePayment = async (req, res) => {
  try {
    const { orderId, method } = req.body;
    if (!orderId || !method) return res.status(400).json({ success: false, message: 'Missing orderId or method' });

    const auth = validateIntegrationAuth(req);
    if (!auth.ok) return res.status(auth.status).json({ success: false, message: auth.message });

    // attach user info from decoded token for convenience
    req.user = auth.decoded;

    const result = await processPayment({ req, orderId, method });
    if (!result.success) return res.status(result.status || 500).json(result);
    return res.status(201).json({ success: true, payment: result.payment, tookMs: result.took });
  } catch (error) {
    logger.error('simulatePayment controller error', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /integrations/shipping/create
const simulateShippingCreate = async (req, res) => {
  try {
    const { orderId, area } = req.body;
    if (!orderId) return res.status(400).json({ success: false, message: 'Missing orderId' });
    const result = await createShipment({ req, orderId, area });
    if (!result.success) return res.status(result.status || 500).json(result);
    return res.status(201).json({ success: true, trackingNumber: result.trackingNumber, created: result.created });
  } catch (error) {
    logger.error('simulateShippingCreate error', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /integrations/shipping/update
const simulateShippingUpdate = async (req, res) => {
  try {
    const { trackingNumber, status } = req.body;
    if (!trackingNumber || !status) return res.status(400).json({ success: false, message: 'Missing trackingNumber or status' });
    const result = await updateShipmentStatus({ req, trackingNumber, status });
    if (!result.success) return res.status(result.status || 500).json(result);
    return res.status(200).json({ success: true });
  } catch (error) {
    logger.error('simulateShippingUpdate error', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { simulatePayment, simulateShippingCreate, simulateShippingUpdate };
