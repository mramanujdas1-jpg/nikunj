const express = require('express');
const router = express.Router();
const Listing = require('../models/Listing');
const User = require('../models/User');
const { requireClerkAuth, requireClerkRole, getSecretKey, normalizeRole } = require('../middleware/clerkAuth');
const Notification = require('../models/Notification');
const { sendApproved, sendRejected } = require('../config/email');

const isAdmin = [requireClerkAuth, requireClerkRole('admin')];

// GET /api/admin/stats
router.get('/stats', isAdmin, async (req, res) => {
  try {
    const [total, pending, approved, rejected, users] = await Promise.all([
      Listing.countDocuments(),
      Listing.countDocuments({ status: 'pending' }),
      Listing.countDocuments({ status: 'approved' }),
      Listing.countDocuments({ status: 'rejected' }),
      User.countDocuments()
    ]);
    const byType = await Listing.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);
    res.json({ success: true, stats: { total, pending, approved, rejected, users, byType } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/listings?status=pending
router.get('/listings', isAdmin, async (req, res) => {
  try {
    const { status = 'pending', page = 1, limit = 20 } = req.query;
    const filter = status !== 'all' ? { status } : {};
    const skip = (Number(page) - 1) * Number(limit);
    const [listings, total] = await Promise.all([
      Listing.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Listing.countDocuments(filter)
    ]);
    res.json({ success: true, listings, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/admin/listings/:id/approve
router.put('/listings/:id/approve', isAdmin, async (req, res) => {
  try {
    const listing = await Listing.findByIdAndUpdate(
      req.params.id,
      {
        status: 'approved',
        adminNote: req.body.note || '',
        $push: { adminActions: { action: 'approved', adminId: req.auth.id, note: req.body.note || '' } }
      },
      { new: true }
    );
    if (!listing) return res.status(404).json({ success: false, message: 'Not found' });
    await Notification.create({
      audience: 'owner',
      user: listing.owner.user,
      type: 'listing_approved',
      title: 'Listing approved',
      message: `${listing.title} is now live.`,
      listing: listing._id
    });
    if (listing.owner.user) {
      const owner = await User.findById(listing.owner.user);
      if (owner?.email) await sendApproved(owner.email, listing.owner.name, listing.title);
    }
    res.json({ success: true, listing, message: 'Listing approved & live!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/admin/listings/:id/reject
router.put('/listings/:id/reject', isAdmin, async (req, res) => {
  try {
    const listing = await Listing.findByIdAndUpdate(
      req.params.id,
      {
        status: 'rejected',
        adminNote: req.body.note || '',
        $push: { adminActions: { action: 'rejected', adminId: req.auth.id, note: req.body.note || '' } }
      },
      { new: true }
    );
    if (!listing) return res.status(404).json({ success: false, message: 'Not found' });
    await Notification.create({
      audience: 'owner',
      user: listing.owner.user,
      type: 'listing_rejected',
      title: 'Listing rejected',
      message: `${listing.title} needs changes before it can go live.`,
      listing: listing._id
    });
    if (listing.owner.user) {
      const owner = await User.findById(listing.owner.user);
      if (owner?.email) await sendRejected(owner.email, listing.owner.name, listing.title, req.body.note || '');
    }
    res.json({ success: true, listing, message: 'Listing rejected' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/admin/listings/:id/feature
router.put('/listings/:id/feature', isAdmin, async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ success: false, message: 'Not found' });
    listing.featured = !listing.featured;
    listing.adminActions.push({ action: 'featured', adminId: req.auth.id });
    await listing.save();
    res.json({ success: true, featured: listing.featured });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/users
router.get('/users', isAdmin, async (req, res) => {
  try {
    const response = await fetch('https://api.clerk.com/v1/users?limit=50&order_by=-created_at', {
      headers: { Authorization: `Bearer ${getSecretKey()}` }
    });
    if (!response.ok) throw new Error('Unable to fetch Clerk users');

    const data = await response.json();
    const users = (data.data || []).map(user => {
      const privateMetadata = user.privateMetadata || user.private_metadata || {};
      const primaryEmail =
        user.emailAddresses?.find(email => email.id === user.primaryEmailAddressId)?.emailAddress ||
        user.email_addresses?.find(email => email.id === user.primary_email_address_id)?.email_address ||
        '';
      const firstName = user.firstName || user.first_name || '';
      const lastName = user.lastName || user.last_name || '';
      return {
        id: user.id,
        name: [firstName, lastName].filter(Boolean).join(' ') || primaryEmail || 'User',
        email: primaryEmail,
        role: normalizeRole(privateMetadata.role),
        createdAt: user.createdAt || user.created_at
      };
    });
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/admin/listings/:id
router.delete('/listings/:id', isAdmin, async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ success: false, message: 'Not found' });
    listing.adminActions.push({ action: 'deleted', adminId: req.auth.id });
    await listing.save();
    await Listing.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Listing deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
