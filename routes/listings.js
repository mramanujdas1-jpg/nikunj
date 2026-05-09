const express = require('express');
const router = express.Router();
const Listing = require('../models/Listing');
const { protect, authorize } = require('../middleware/auth');
const Notification = require('../models/Notification');

// GET /api/listings — search + filter
router.get('/', async (req, res) => {
  try {
    const { type, minPrice, maxPrice, area, gender, q, page = 1, limit = 12, featured } = req.query;
    const filter = { status: 'approved' };
    if (type && type !== 'all') filter.type = type;
    if (gender && gender !== 'any') filter.gender = gender;
    if (area) filter['location.area'] = new RegExp(area, 'i');
    if (featured === 'true') filter.featured = true;
    if (minPrice || maxPrice) {
      filter['pricing.amount'] = {};
      if (minPrice) filter['pricing.amount'].$gte = Number(minPrice);
      if (maxPrice) filter['pricing.amount'].$lte = Number(maxPrice);
    }
    if (q) filter.$text = { $search: q };
    const skip = (Number(page) - 1) * Number(limit);
    const [listings, total] = await Promise.all([
      Listing.find(filter).sort({ featured: -1, createdAt: -1 }).skip(skip).limit(Number(limit)),
      Listing.countDocuments(filter)
    ]);
    res.json({ success: true, listings, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/listings/owner/mine
router.get('/owner/mine', protect, async (req, res) => {
  try {
    const listings = await Listing.find({ 'owner.user': req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, listings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/listings — owner submits new listing
router.post('/', protect, async (req, res) => {
  try {
    const data = { ...req.body, owner: { ...req.body.owner, user: req.user._id }, status: 'pending' };
    const listing = await Listing.create(data);
    await Notification.create({
      audience: 'admin',
      type: 'listing_submitted',
      title: 'New listing submitted',
      message: `${listing.title} is waiting for review.`,
      listing: listing._id
    });
    res.status(201).json({ success: true, listing, message: 'Listing submitted for admin review!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/listings/:id — owner updates their listing
router.put('/:id', protect, async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ success: false, message: 'Not found' });
    if (listing.owner.user.toString() !== req.user._id.toString() && req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Not authorized' });
    Object.assign(listing, req.body);
    listing.updatedAt = Date.now();
    listing.status = 'pending'; // re-review on edit
    await listing.save();
    res.json({ success: true, listing });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/listings/:id/review
router.post('/:id/review', protect, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    if (!rating || !comment || String(comment).trim().length < 3)
      return res.status(400).json({ success: false, message: 'Rating and comment required' });
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ success: false, message: 'Not found' });
    const already = listing.reviews.find(r => r.user.toString() === req.user._id.toString());
    if (already) return res.status(400).json({ success: false, message: 'Already reviewed' });
    listing.reviews.push({ user: req.user._id, name: req.user.name, rating: Number(rating), comment: String(comment).trim() });
    listing.updateRating();
    await listing.save();
    res.status(201).json({ success: true, message: 'Review added!', listing, avgRating: listing.avgRating });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/listings/:id
router.get('/:id', async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ success: false, message: 'Listing not found' });
    listing.views += 1;
    await listing.save();
    res.json({ success: true, listing });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
