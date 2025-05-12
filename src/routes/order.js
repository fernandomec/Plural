const express = require('express');
const router = express.Router();
const OrderController = require('../controllers/OrderController');
const { authenticate } = require('../middleware/auth');

router.get('/checkout', authenticate, OrderController.getCheckoutPage);
router.post('/checkout/confirm', authenticate, OrderController.confirmCheckout);
router.get('/status-pedido', authenticate, OrderController.getOrderStatusPage);

module.exports = router;
