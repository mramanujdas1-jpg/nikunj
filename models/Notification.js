const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  audience: { type: String, enum: ['admin', 'owner', 'student', 'user'], default: 'user', index: true },
  clerkUserId: { type: String, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: { type: String, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing' },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', notificationSchema);
