const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');
const Listing = require('../models/Listing');
const { requireClerkAuth, requireClerkRole } = require('../middleware/clerkAuth');

const isAdmin = [requireClerkAuth, requireClerkRole('admin')];

// POST /api/leads — any user (or guest) submits interest in a listing
router.post('/', async (req, res) => {
  try {
    const { listingId, userName, userEmail, message, type } = req.body;
    if (!listingId || !userName || !userEmail) {
      return res.status(400).json({ success: false, message: 'listingId, userName and userEmail are required' });
    }

    // Verify listing exists
    const listing = await Listing.findById(listingId).select('title status');
    if (!listing) return res.status(404).json({ success: false, message: 'Listing not found' });
    if (listing.status !== 'approved') return res.status(400).json({ success: false, message: 'Listing is not active' });

    // Basic email format guard
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) {
      return res.status(400).json({ success: false, message: 'Invalid email address' });
    }

    const lead = await Lead.create({
      listingId,
      listingTitle: listing.title,
      userId: req.body.userId || null,
      userName: String(userName).trim().slice(0, 100),
      userEmail: String(userEmail).trim().toLowerCase().slice(0, 200),
      message: String(message || '').trim().slice(0, 1000),
      type: ['interested', 'callback', 'visit'].includes(type) ? type : 'interested'
    });

    res.status(201).json({ success: true, message: 'Thank you! Our team will reach out shortly.', leadId: lead._id });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/leads/admin — admin only: view all leads
router.get('/admin', isAdmin, async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const filter = status && status !== 'all' ? { status } : {};
    const skip = (Number(page) - 1) * Number(limit);
    const [leads, total] = await Promise.all([
      Lead.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Lead.countDocuments(filter)
    ]);
    res.json({ success: true, leads, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/leads/admin/:id — admin only: update lead status
router.patch('/admin/:id', isAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['pending', 'contacted', 'visit_scheduled', 'closed'];
    if (!allowed.includes(status)) return res.status(400).json({ success: false, message: 'Invalid status' });
    const lead = await Lead.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    res.json({ success: true, lead });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
