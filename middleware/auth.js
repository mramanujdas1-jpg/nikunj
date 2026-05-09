const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getSafeUserFromToken } = require('./clerkAuth');

async function getOrCreateClerkUser(safeUser) {
  const email = safeUser.email || `${safeUser.id}@clerk.local`;
  let user = await User.findOne({ $or: [{ clerkId: safeUser.id }, { email }] });
  if (!user) {
    const data = {
      clerkId: safeUser.id,
      name: safeUser.name || 'User',
      email,
      password: `clerk_${safeUser.id}_${Date.now()}`
    };
    if (safeUser.role) data.role = safeUser.role;
    user = await User.create(data);
  } else {
    user.clerkId = user.clerkId || safeUser.id;
    user.name = safeUser.name || user.name;
    if (safeUser.role) user.role = safeUser.role;
    user.lastLoginAt = new Date();
    await user.save();
  }
  return user;
}

exports.protect = async (req, res, next) => {
  try {
    let token = req.headers.authorization?.startsWith('Bearer')
      ? req.headers.authorization.split(' ')[1]
      : null;
    if (!token) return res.status(401).json({ success: false, message: 'Not authorized' });

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'nikunj_secret');
      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) return res.status(401).json({ success: false, message: 'User not found' });
    } catch (jwtErr) {
      const safeUser = await getSafeUserFromToken(token);
      req.user = await getOrCreateClerkUser(safeUser);
      req.auth = safeUser;
    }

    next();
  } catch (err) {
    res.status(401).json({ success: false, message: 'Token invalid' });
  }
};

exports.authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role))
    return res.status(403).json({ success: false, message: 'Access denied' });
  next();
};
