const express = require('express');
const auth = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const router = express.Router();

// POST /upload/cat-images
// Multipart body: `images` (file) × 2
// Returns: { image_url_1, image_url_2 }
router.post('/cat-images', auth, upload.array('images', 2), (req, res) => {
  if (!req.files || req.files.length !== 2) {
    return res.status(400).json({ message: 'Exactly 2 images are required' });
  }

  const [first, second] = req.files;
  res.json({
    image_url_1: `/uploads/cats/${first.filename}`,
    image_url_2: `/uploads/cats/${second.filename}`,
  });
});

// Multer error surface (file too large, too many files, bad mime)
router.use((err, _req, res, _next) => {
  if (err) return res.status(400).json({ message: err.message });
});

module.exports = router;
