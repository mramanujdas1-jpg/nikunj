const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  clerkId:  { type: String, unique: true, sparse: true, index: true },
  name:     { type: String, required: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true },
  phone:    { type: String, trim: true },
  password: { type: String, required: true, minlength: 6 },
  role:     { type: String, enum: ['student', 'owner', 'admin'], default: 'student' },
  college:  { type: String },
  savedListings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Listing' }],
  ownerVerification: {
    status: { type: String, enum: ['none', 'pending', 'verified', 'rejected'], default: 'none' },
    documents: [{ type: String }],
    note: { type: String },
    reviewedAt: { type: Date }
  },
  avatar:   { type: String, default: '' },
  lastLoginAt: { type: Date },
  createdAt:{ type: Date, default: Date.now }
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.matchPassword = async function(entered) {
  return await bcrypt.compare(entered, this.password);
};

module.exports = mongoose.model('User', userSchema);
