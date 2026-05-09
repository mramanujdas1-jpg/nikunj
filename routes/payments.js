const crypto = require('crypto');
const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const Listing = require('../models/Listing');
const { protect } = require('../middleware/auth');

const ALLOWED_TYPES = new Set(['premium_listing', 'featured_listing', 'booking_advance', 'subscription']);

function razorpayConfigured() {
  return process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET;
}

router.post('/orders', protect, async (req, res) => {
  try {
    if (!razorpayConfigured()) {
      return res.status(503).json({ success: false, message: 'Razorpay is not configured' });
    }

    const { type, listingId, amount, metadata = {} } = req.body;
    if (!ALLOWED_TYPES.has(type)) return res.status(400).json({ success: false, message: 'Invalid payment type' });
    if (!amount || Number(amount) < 1) return res.status(400).json({ success: false, message: 'Invalid amount' });

    let listing = null;
    if (listingId) {
      listing = await Listing.findById(listingId);
      if (!listing) return res.status(404).json({ success: false, message: 'Listing not found' });
      if (listing.owner.user?.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Not authorized for this listing' });
      }
    }

    const receipt = `nikunj_${Date.now()}`;
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64')}`
      },
      body: JSON.stringify({
        amount: Math.round(Number(amount) * 100),
        currency: 'INR',
        receipt,
        notes: { type, listingId: listingId || '', ...metadata }
      })
    });
    const order = await response.json();
    if (!response.ok) return res.status(502).json({ success: false, message: order.error?.description || 'Payment order failed' });

    const payment = await Payment.create({
      clerkUserId: req.auth?.id,
      user: req.user._id,
      listing: listing?._id,
      type,
      amount: Number(amount),
      razorpayOrderId: order.id,
      metadata
    });

    res.json({
      success: true,
      order,
      paymentId: payment._id,
      keyId: process.env.RAZORPAY_KEY_ID
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/verify', protect, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expected !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    const payment = await Payment.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      {
        status: 'paid',
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        updatedAt: new Date()
      },
      { new: true }
    );
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });

    if (payment.listing && ['premium_listing', 'featured_listing'].includes(payment.type)) {
      const update = { featured: true };
      if (payment.type === 'premium_listing') {
        update.premium = { active: true, plan: 'premium', expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) };
      }
      await Listing.findByIdAndUpdate(payment.listing, update);
    }

    res.json({ success: true, payment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
