const express = require('express');
const router = express.Router();
const { requireClerkAuth } = require('../middleware/clerkAuth');
const User = require('../models/User');

router.get('/me', requireClerkAuth, async (req, res) => {
  const email = req.auth.email || `${req.auth.id}@clerk.local`;
  let user = await User.findOne({ $or: [{ clerkId: req.auth.id }, { email }] });
  if (!user) {
    user = await User.create({
      clerkId: req.auth.id,
      name: req.auth.name || 'User',
      email,
      password: `clerk_${req.auth.id}_${Date.now()}`,
      role: req.auth.role
    });
  } else {
    user.clerkId = user.clerkId || req.auth.id;
    user.name = req.auth.name || user.name;
    user.role = req.auth.role || user.role;
    user.lastLoginAt = new Date();
    await user.save();
  }

  res.json({
    success: true,
    user: {
      ...req.auth,
      savedListings: (user.savedListings || []).map(id => String(id)),
      ownerVerification: user.ownerVerification
    }
  });
});

module.exports = router;
