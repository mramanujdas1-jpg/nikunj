const express = require('express');
const router = express.Router();
const Listing = require('../models/Listing');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { sendInquiry } = require('../config/email');

// POST /api/inquiries/:listingId — student contacts owner
router.post('/:listingId', protect, async (req, res) => {
  try {
    const { message } = req.body;
    const listing = await Listing.findById(req.params.listingId);
    if (!listing) return res.status(404).json({ success: false, message: 'Listing not found' });
    if (listing.status !== 'approved')
      return res.status(400).json({ success: false, message: 'Listing is not active' });

    // Find owner's email if they're a registered user
    let ownerEmail = null;
    if (listing.owner.user) {
      const ownerUser = await User.findById(listing.owner.user);
      ownerEmail = ownerUser?.email;
    }

    // Send email notification to owner
    if (ownerEmail) {
      await sendInquiry(
        ownerEmail,
        listing.owner.name,
        req.user.name,
        req.user.phone || 'Not provided',
        listing.title,
        message
      );
    }

    res.json({
      success: true,
      message: 'Inquiry sent to owner!',
      ownerPhone: listing.owner.phone,
      ownerWhatsapp: listing.owner.whatsapp
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
