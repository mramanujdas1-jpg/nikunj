const mongoose = require('mongoose');

const LeadSchema = new mongoose.Schema({
  listingId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
  listingTitle: { type: String, required: true },
  userId:       { type: String },               // Clerk user ID (optional for guests)
  userName:     { type: String, required: true },
  userEmail:    { type: String, required: true },
  message:      { type: String, default: '' },
  type:         { type: String, enum: ['interested', 'callback', 'visit'], default: 'interested' },
  status:       { type: String, enum: ['pending', 'contacted', 'visit_scheduled', 'closed'], default: 'pending' }
}, { timestamps: true });

module.exports = mongoose.model('Lead', LeadSchema);
