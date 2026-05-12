const crypto = require('crypto');
const multer = require('multer');
const path = require('path');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedExt = ['.jpg', '.jpeg', '.png', '.webp'];
  const allowedMime = ['image/jpeg', 'image/png', 'image/webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExt.includes(ext) && allowedMime.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Only JPG, PNG, WEBP images allowed'), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

function isPlaceholder(val) {
  if (!val) return true;
  const v = val.trim();
  return !v || /^YOUR_/i.test(v) || v === 'undefined' || v === 'null';
}

const uploadToCloudinary = async (buffer, folder = 'nikunj', mimeType = 'image/jpeg') => {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (isPlaceholder(CLOUDINARY_CLOUD_NAME) || isPlaceholder(CLOUDINARY_API_KEY) || isPlaceholder(CLOUDINARY_API_SECRET)) {
    throw new Error('Cloudinary credentials are not configured');
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto
    .createHash('sha1')
    .update(`folder=${folder}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`)
    .digest('hex');

  const form = new FormData();
  form.append('file', `data:${mimeType};base64,${buffer.toString('base64')}`);
  form.append('folder', folder);
  form.append('timestamp', String(timestamp));
  form.append('api_key', CLOUDINARY_API_KEY);
  form.append('signature', signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: form
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error('Cloudinary upload failed: ' + errText);
  }
  const result = await response.json();
  return result.secure_url;
};

module.exports = { upload, uploadToCloudinary };
