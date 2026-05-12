const express = require('express');
const router = express.Router();
const { upload, uploadToCloudinary } = require('../middleware/upload');
const { requireClerkAuth } = require('../middleware/clerkAuth');

function handleMulterUpload(uploadMiddleware) {
  return (req, res, next) => {
    uploadMiddleware(req, res, err => {
      if (!err) return next();
      const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      res.status(status).json({ success: false, message: err.message || 'Upload failed' });
    });
  };
}

// POST /api/upload/images — upload up to 5 listing images
router.post('/images', requireClerkAuth, handleMulterUpload(upload.array('images', 5)), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0)
      return res.status(400).json({ success: false, message: 'No files uploaded' });

    const urls = await Promise.all(
      req.files.map(file => uploadToCloudinary(file.buffer, 'nikunj/listings', file.mimetype))
    );

    res.json({ success: true, urls, images: urls, count: urls.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/upload/avatar — upload profile avatar
router.post('/avatar', requireClerkAuth, handleMulterUpload(upload.single('avatar')), async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ success: false, message: 'No file uploaded' });

    const url = await uploadToCloudinary(req.file.buffer, 'nikunj/avatars', req.file.mimetype);
    const User = require('../models/User');
    const lookup = [{ clerkId: req.auth.id }];
    if (req.auth.email) lookup.push({ email: req.auth.email });
    await User.findOneAndUpdate({ $or: lookup }, { avatar: url }, { new: true });
    res.json({ success: true, url });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
