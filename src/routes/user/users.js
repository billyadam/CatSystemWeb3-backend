const express = require('express');
const authMiddleware = require('../../middleware/auth');
const { uploadPdf } = require('../../services/uploadPdf');
const { uploadProfile } = require('../../services/uploadProfile');
const { findByWallet, insertOnboarding, updateProfileBio, updateProfilePicture } = require('../../repositories/userRepository');
const { findActiveRequestByWallet, createBreederRequest } = require('../../repositories/requestRepository');
const {
  ProfileUpdateError,
  submitProfileUpdateRequest,
} = require('../../services/profileUpdateRequest');
const router = express.Router();

// POST /users/onboard
// Body: { name, bio?, email, phone_number?, city, country, birthdate }
// Requires: Bearer token (authMiddleware)
router.post('/onboard', authMiddleware, async (req, res) => {
  const { name, bio, email, phone_number, city, country, birthdate } = req.body;

  // Required fields
  if (!name || !email || !city || !country || !birthdate) {
    return res.status(400).json({
      message: 'name, email, city, country, and birthdate are required',
    });
  }

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Invalid email format' });
  }

  // birthdate must be a valid date (YYYY-MM-DD)
  if (isNaN(Date.parse(birthdate))) {
    return res.status(400).json({ message: 'birthdate must be a valid date (YYYY-MM-DD)' });
  }

  let user;
  try {
    user = await insertOnboarding(req.user.wallet, {
      name: name.trim(),
      bio: bio?.trim() ?? null,
      email: email.trim().toLowerCase(),
      phone_number: phone_number?.trim() ?? null,
      city: city.trim(),
      country: country.trim(),
      birthdate,
    });
  } catch (err) {
    console.error('[users] Database error:', err.message);
    return res.status(500).json({ message: 'Internal server error' });
  }

  return res.status(200).json({
    wallet: user.wallet_address,
    name: user.name,
    bio: user.bio,
    email: user.email,
    phone_number: user.phone_number,
    city: user.city,
    country: user.country,
    birthdate: user.birthdate,
    onboarded: true,
  });
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await findByWallet(req.user.wallet);
    res.json({ id: req.user.sub, wallet: req.user.wallet, user_data: user });
  } catch {
    return res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * POST /users/request-breeder
 *
 * Submit a breeder upgrade request with a supporting PDF document.
 * Multipart body: `document` (file, PDF only, max 10 MB)
 * Requires: Bearer token in Authorization header.
 *
 * Response 201:
 *   { message, request: { id, user_wallet, requested_at, status, document_url } }
 */
router.post('/request-breeder', authMiddleware, uploadPdf.single('document'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'A PDF document is required.' });
  }

  const documentUrl = `/uploads/request-breeder/${req.file.filename}`;

  try {
    // Guard: prevent duplicate active requests
    const existing = await findActiveRequestByWallet(req.user.wallet);
    if (existing) {
      return res.status(409).json({
        message:
          existing.status === 'approved'
            ? 'Your breeder upgrade has already been approved.'
            : 'You already have a pending breeder upgrade request.',
        status: existing.status,
      });
    }

    const request = await createBreederRequest(req.user.wallet, documentUrl);

    return res.status(201).json({
      message: 'Breeder upgrade request submitted successfully.',
      request: {
        id: request.id,
        user_wallet: request.user_wallet,
        requested_at: request.requested_at,
        status: request.status,
        document_url: request.document_url,
      },
    });
  } catch (err) {
    console.error('[users] Error creating breeder request:', err.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * PUT /users/profile
 * Update user profile.
 *
 * Body: { bio?, name?, phone_number?, email?, country?, city? }
 *
 * Aturan:
 *   - `bio`  → langsung mengganti data user.
 *   - `name`, `phone_number`, `email`, `country`, `city`
 *        → JIKA berubah, dibuatkan request pending (menunggu persetujuan admin).
 */
router.put('/profile', authMiddleware, async (req, res) => {
  const { bio } = req.body;

  try {
    // 1. Update bio secara langsung.
    const user = await updateProfileBio(req.user.wallet, bio?.trim() ?? null);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // 2. Untuk name/phone_number/email/country/city → buat request pending JIKA berubah.
    let pendingRequest = null;
    try {
      pendingRequest = await submitProfileUpdateRequest(req.user.wallet, req.body);
    } catch (err) {
      switch (err.message) {
        // Tidak ada field approval yang dikirim / tidak ada yang berubah → wajar, abaikan.
        case ProfileUpdateError.NO_FIELDS:
        case ProfileUpdateError.NO_CHANGES:
          break;
        case ProfileUpdateError.INVALID_EMAIL:
          return res.status(400).json({ message: 'Invalid email format' });
        case ProfileUpdateError.PENDING_REQUEST_EXISTS:
          return res.status(409).json({
            message: 'You already have a pending profile update request',
          });
        default:
          throw err;
      }
    }

    return res.status(200).json({
      message: pendingRequest
        ? 'Profile updated. Some changes are waiting for admin approval.'
        : 'Profile updated successfully',
      user: {
        wallet_address: user.wallet_address,
        name: user.name,
        bio: user.bio,
        profile_picture_url: user.profile_picture_url,
      },
      pendingRequest,
    });
  } catch (err) {
    console.error('[users] Error updating profile:', err.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * POST /users/profile-picture
 * Update user profile picture.
 */
router.post('/profile-picture', authMiddleware, uploadProfile.single('photo'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'A valid photo image is required.' });
  }

  const pictureUrl = `/uploads/users/${req.file.filename}`;

  try {
    await updateProfilePicture(req.user.wallet, pictureUrl);
    
    return res.status(200).json({
      message: 'Profile picture updated successfully',
      profile_picture_url: pictureUrl,
    });
  } catch (err) {
    console.error('[users] Error updating profile picture:', err.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

router.use((err, _req, res, _next) => {
  if (err) return res.status(400).json({ message: err.message });
});

module.exports = router;