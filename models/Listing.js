const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:    { type: String, required: true },
  rating:  { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true },
  date:    { type: Date, default: Date.now }
});

const listingSchema = new mongoose.Schema({
  title:       { type: String, required: true, trim: true },
  type:        { type: String, required: true, enum: ['hostel', 'room', 'flat', 'tiffin'] },
  description: { type: String, required: true },
  owner: {
    user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name:    { type: String, required: true },
    phone:   { type: String, required: true },
    whatsapp:{ type: String }
  },
  location: {
    address:   { type: String, required: true },
    area:      { type: String, required: true },
    city:      { type: String, default: '' },
    pincode:   { type: String },
    lat:       { type: Number },
    lng:       { type: Number },
    nearbyColleges: [String]
  },
  pricing: {
    amount:   { type: Number, required: true },
    period:   { type: String, default: 'month', enum: ['month', 'day'] },
    deposit:  { type: Number, default: 0 },
    negotiable: { type: Boolean, default: false }
  },
  facilities: [{ type: String }],
  images:     [{ type: String }],
  gender:     { type: String, enum: ['male', 'female', 'any'], default: 'any' },
  availability: { type: Boolean, default: true },
  status:     { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  adminNote:  { type: String },
  adminActions: [{
    action: { type: String, enum: ['approved', 'rejected', 'deleted', 'featured'] },
    adminId: { type: String },
    note: { type: String },
    date: { type: Date, default: Date.now }
  }],
  premium: {
    active: { type: Boolean, default: false },
    plan: { type: String },
    expiresAt: { type: Date }
  },
  booking: {
    enabled: { type: Boolean, default: false },
    advanceAmount: { type: Number, default: 0 }
  },
  reviews:    [reviewSchema],
  avgRating:  { type: Number, default: 0 },
  totalReviews: { type: Number, default: 0 },
  views:      { type: Number, default: 0 },
  featured:   { type: Boolean, default: false },
  createdAt:  { type: Date, default: Date.now },
  updatedAt:  { type: Date, default: Date.now }
});

// Update avgRating when reviews change
listingSchema.methods.updateRating = function() {
  if (this.reviews.length === 0) { this.avgRating = 0; this.totalReviews = 0; return; }
  const sum = this.reviews.reduce((acc, r) => acc + r.rating, 0);
  this.avgRating = Math.round((sum / this.reviews.length) * 10) / 10;
  this.totalReviews = this.reviews.length;
};

// Text index for search
listingSchema.index({ title: 'text', description: 'text', 'location.area': 'text', facilities: 'text' });

module.exports = mongoose.model('Listing', listingSchema);
