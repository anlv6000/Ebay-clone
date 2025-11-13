const axios = require('axios');
const logger = require('../utils/logger');
const ShippingInfo = require('../models/ShippingInfo');
const OrderItem = require('../models/OrderItem');
const Order = require('../models/Order');
const { sendEmail } = require('./emailService');

// Retry helper with exponential backoff
const retry = async (fn, attempts = 3, delay = 500) => {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      logger.error(`Shipping attempt ${i + 1} failed: ${err.message}`);
      await new Promise(r => setTimeout(r, delay * Math.pow(2, i)));
    }
  }
  throw lastErr;
};

// Simulate creating a shipment with a carrier API (fake)
const createShipment = async ({ req, orderId, area }) => {
  // Basic auth for integration
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.SIM_API_KEY) return { success: false, status: 401, message: 'Invalid integration key' };

  try {
    // Create a tracking number
    const trackingNumber = `SIMSHIP-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;

    // Create shipping info entries for order items
    const orderItems = await OrderItem.find({ orderId });
    if (!orderItems || orderItems.length === 0) return { success: false, status: 404, message: 'Order items not found' };

    const created = [];
    for (const item of orderItems) {
      const ship = new ShippingInfo({
        orderItemId: item._id,
        carrier: 'SIMCARRIER',
        trackingNumber,
        status: 'shipping'
      });
      await ship.save();
      // update orderItem status
      item.status = 'shipping';
      await item.save();
      created.push(ship);
    }

    // Optionally update order status
    const order = await Order.findById(orderId);
    if (order && order.status === 'processing') {
      order.status = 'shipping';
      await order.save();
    }

    logger.info('Shipment created', { orderId, trackingNumber });
    return { success: true, trackingNumber, created };
  } catch (error) {
    logger.error('createShipment error', error.message);
    return { success: false, status: 500, message: error.message };
  }
};

// Update shipment status (simulate carrier callback)
const updateShipmentStatus = async ({ req, trackingNumber, status }) => {
  // Validate api key
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.SIM_API_KEY) return { success: false, status: 401, message: 'Invalid integration key' };

  try {
    // Find all shipping info with this tracking number
    const shippings = await ShippingInfo.find({ trackingNumber });
    if (!shippings || shippings.length === 0) return { success: false, status: 404, message: 'Tracking not found' };

    for (const ship of shippings) {
      ship.status = status;
      await ship.save();

      // Update order item
      const item = await OrderItem.findById(ship.orderItemId);
      if (item) {
        item.status = (status === 'delivered') ? 'shipped' : (status === 'failed') ? 'failed to ship' : item.status;
        await item.save();

        // When delivered, check order completion and notify
        if (status === 'delivered') {
          const order = await Order.findById(item.orderId).populate('buyerId');
          // Send email notification
          try {
            await sendEmail(order.buyerId.email, 'Order Delivered', `Your order ${order._id} item ${item._id} has been delivered. Tracking: ${trackingNumber}`);
          } catch (emailErr) {
            logger.error('Failed to send delivery email:', emailErr.message);
          }
        }
      }
    }

    // After updating items, try to sync order to 'shipped' if all items shipped
    const anyPending = await OrderItem.findOne({ orderId: shippings[0].orderItemId ? (await OrderItem.findById(shippings[0].orderItemId)).orderId : null, status: { $in: ['pending', 'shipping'] } });
    if (!anyPending) {
      // Mark order as shipped
      const sampleItem = shippings[0];
      const sampleOrderId = (await OrderItem.findById(sampleItem.orderItemId)).orderId;
      await Order.findByIdAndUpdate(sampleOrderId, { status: 'shipped' });
    }

    logger.info('Shipment status updated', { trackingNumber, status });
    return { success: true };
  } catch (error) {
    logger.error('updateShipmentStatus error', error.message);
    return { success: false, status: 500, message: error.message };
  }
};

module.exports = { createShipment, updateShipmentStatus };
