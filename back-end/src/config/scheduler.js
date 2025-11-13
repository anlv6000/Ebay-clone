// scheduler.js
const cron = require('node-cron');
const { verifyPendingPayments } = require('../services/paymentVerificationService');
const Order = require('../models/Order');
const { sendEmail } = require('../services/emailService');
const logger = require('../utils/logger');

/**
 * Khởi tạo tất cả các công việc định kỳ
 */
const initScheduler = () => {
  // Kiểm tra các thanh toán đang chờ mỗi 5 phút
  cron.schedule('*/5 * * * *', async () => {
    console.log('Running scheduled payment verification task...');
    await verifyPendingPayments();
  });
  
  // Huỷ đơn hàng quá thời gian chờ thanh toán (ví dụ 30 phút)
  cron.schedule('*/10 * * * *', async () => {
    try {
      console.log('Running scheduled pending-order cancel task...');
      const cutoff = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
      const pendingOrders = await Order.find({ status: 'pending', createdAt: { $lte: cutoff } });
      for (const order of pendingOrders) {
        logger.info('Auto-cancelling order due to payment timeout', order._id.toString());
        order.status = 'rejected';
        await order.save();
        try {
          // attempt to notify buyer
          const buyer = await order.populate('buyerId');
          if (buyer && buyer.buyerId && buyer.buyerId.email) {
            await sendEmail(buyer.buyerId.email, 'Order cancelled due to payment timeout', `Your order ${order._id} was cancelled because payment was not completed within the expected time.`);
          }
        } catch (emailErr) {
          logger.error('Failed to send auto-cancel email', emailErr.message);
        }
      }
    } catch (err) {
      logger.error('Error in auto-cancel scheduler', err.message);
    }
  });
  
  console.log('Payment verification scheduler initialized');
};

module.exports = {
  initScheduler
}; 