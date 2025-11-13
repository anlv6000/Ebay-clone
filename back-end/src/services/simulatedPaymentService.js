const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const logger = require('../utils/logger');
const { Payment, Order } = require('../models');
const { sendEmail } = require('./emailService');

// Simulated processing latency (ms)
const MIN_LATENCY = 200;
const MAX_LATENCY = 1200; // keep < 2000 to meet the 2s requirement

// Validate API key and auth token
const validateIntegrationAuth = (req) => {
  const apiKey = req.headers['x-api-key'];
  const authHeader = req.headers['authorization'];
  if (!apiKey || apiKey !== process.env.SIM_API_KEY) {
    return { ok: false, status: 401, message: 'Invalid or missing integration API key' };
  }
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { ok: false, status: 401, message: 'Missing Authorization header' };
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return { ok: true, decoded };
  } catch (err) {
    return { ok: false, status: 401, message: 'Invalid or expired token' };
  }
};

const randomLatency = () => Math.floor(Math.random() * (MAX_LATENCY - MIN_LATENCY + 1)) + MIN_LATENCY;

// Process a simulated payment (PayPal-like) or COD
const processPayment = async ({ req, orderId, method }) => {
  // Validate integration headers
  const auth = validateIntegrationAuth(req);
  if (!auth.ok) return { success: false, status: auth.status, message: auth.message };

  const start = Date.now();
  try {
    const order = await Order.findById(orderId);
    if (!order) return { success: false, status: 404, message: 'Order not found' };
    if (order.status !== 'pending') return { success: false, status: 400, message: 'Order not payable' };

    // Create a payment record
    const payment = new Payment({
      orderId: order._id,
      userId: req.user?.id || auth.decoded.id,
      amount: order.totalPrice,
      method,
      status: 'pending'
    });
    await payment.save();

    // Simulate processing time (under 2s)
    await new Promise((resolve) => setTimeout(resolve, randomLatency()));

    let result = { status: 'pending' };
    if (method === 'COD') {
      // COD stays pending until delivery
      result.status = 'pending';
      payment.status = 'pending';
      payment.transactionId = `COD-${Date.now()}`;
    } else {
      // Simulate PayPal immediate success
      result.status = 'paid';
      payment.status = 'paid';
      payment.transactionId = `SIMPAY-${crypto.randomBytes(6).toString('hex')}`;
      payment.paidAt = new Date();
    }

    await payment.save();

    // Update order status for non-COD
    if (result.status === 'paid') {
      order.status = 'processing';
      await order.save();

      // Send email confirmation
      try {
        await sendEmail(req.user.email || auth.decoded.email, 'Payment received', `Payment for order ${order._id} was successful. Transaction: ${payment.transactionId}`);
      } catch (emailErr) {
        logger.error('Failed to send payment email:', emailErr.message);
      }
    }

    const took = Date.now() - start;
    logger.info('Simulated payment processed', { orderId: order._id.toString(), method, transactionId: payment.transactionId, took });

    return { success: true, payment: { id: payment._id, transactionId: payment.transactionId, status: payment.status }, took };
  } catch (error) {
    logger.error('Simulated payment error', error);
    return { success: false, status: 500, message: error.message };
  }
};

module.exports = { processPayment, validateIntegrationAuth };
