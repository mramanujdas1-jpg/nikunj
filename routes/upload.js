const express = require('express');
const router = express.Router();
const { upload, uploadToCloudinary } = require('../middleware/upload');
const { protect } = require('../middleware/auth');

// POST /api/upload/images — upload up to 5 listing images
router.post('/images', protect, upload.array('images', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0)
      return res.status(400).json({ success: false, message: 'No files uploaded' });

    const urls = await Promise.all(
      req.files.map(file => uploadToCloudinary(file.buffer, 'nikunj/listings'))
    );

    res.json({ success: true, urls, count: urls.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/upload/avatar — upload profile avatar
router.post('/avatar', protect, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ success: false, message: 'No file uploaded' });

    const url = await uploadToCloudinary(req.file.buffer, 'nikunj/avatars');
    const User = require('../models/User');
    await User.findByIdAndUpdate(req.user._id, { avatar: url });
    res.json({ success: true, url });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
