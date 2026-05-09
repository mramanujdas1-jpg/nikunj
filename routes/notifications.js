const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');
const { requireClerkAuth, requireClerkRole } = require('../middleware/clerkAuth');

router.get('/mine', protect, async (req, res) => {
  try {
    const notifications = await Notification.find({
      $or: [{ user: req.user._id }, { clerkUserId: req.auth?.id }]
    }).sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, notifications });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/admin', requireClerkAuth, requireClerkRole('admin'), async (req, res) => {
  try {
    const notifications = await Notification.find({ audience: 'admin' }).sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, notifications });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:id/read', protect, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, $or: [{ user: req.user._id }, { clerkUserId: req.auth?.id }] },
      { read: true },
      { new: true }
    );
    if (!notification) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, notification });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
