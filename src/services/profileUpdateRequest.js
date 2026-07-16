const db = require('../database/knex');
const {
  findByWalletForUpdate,
  updateProfileBio,
} = require('../repositories/userRepository');
const {
  findActivePendingProfileUpdate,
  createProfileUpdateRequest,
} = require('../repositories/profileUpdateRequestRepository');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const APPROVAL_FIELDS = ['name', 'phone_number', 'email', 'country', 'city'];

/**
 * Domain errors thrown by this service. Route layer maps these to HTTP status.
 */
const ProfileUpdateError = {
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  NO_FIELDS: 'NO_FIELDS',
  INVALID_EMAIL: 'INVALID_EMAIL',
  PENDING_REQUEST_EXISTS: 'PENDING_REQUEST_EXISTS',
};

/**
 * Normalize a raw payload into the approval fields we care about.
 * Trims strings, lowercases email, drops undefined/empty values.
 */
function normalizePayload(payload = {}) {
  const normalized = {};
  for (const field of APPROVAL_FIELDS) {
    let value = payload[field];
    if (value === undefined || value === null) continue;
    if (typeof value === 'string') {
      value = value.trim();
      if (value === '') continue;
      if (field === 'email') value = value.toLowerCase();
    }
    normalized[field] = value;
  }
  return normalized;
}

/**
 * Update profil user dalam satu transaksi:
 *   - `bio`  → langsung mengganti data user.
 *   - `name`, `phone_number`, `email`, `country`, `city`
 *        → JIKA berubah, dibuatkan baris `request_profile_updates` (pending),
 *          menyimpan nilai sebelum (`*_old`) & sesudah (`*_new`).
 *
 * @param {string} walletAddress
 * @param {object} payload raw request body { bio?, name?, phone_number?, email?, country?, city? }
 * @returns {Promise<{ user: object, pendingRequest: object|null }>}
 * @throws {Error} with message from ProfileUpdateError
 */
async function submitProfileUpdateRequest(walletAddress, payload = {}) {
  const requested = normalizePayload(payload);
  const bioProvided = payload.bio !== undefined;
  const bioValue = bioProvided ? (payload.bio?.trim() ?? null) : undefined;

  // Validasi murni (tanpa DB) → gagal cepat sebelum membuka transaksi.
  if (!bioProvided && Object.keys(requested).length === 0) {
    throw new Error(ProfileUpdateError.NO_FIELDS);
  }

  if (requested.email && !EMAIL_REGEX.test(requested.email)) {
    throw new Error(ProfileUpdateError.INVALID_EMAIL);
  }

  // Transaction block: kunci baris user, update bio, cek duplikat, dan insert
  // request secara atomik. Kalau ada langkah gagal → semua di-rollback.
  return db.transaction(async (trx) => {
    const user = await findByWalletForUpdate(walletAddress, trx);
    if (!user) {
      throw new Error(ProfileUpdateError.USER_NOT_FOUND);
    }

    // 1. Update bio langsung (kalau dikirim).
    let updatedUser = user;
    if (bioProvided) {
      updatedUser = await updateProfileBio(walletAddress, bioValue, trx);
    }

    // 2. Field approval → ambil hanya yang benar-benar berubah.
    const oldValues = {};
    const newValues = {};
    for (const [field, value] of Object.entries(requested)) {
      const current = user[field] ?? null;
      if (current === value) continue;
      oldValues[field] = current;
      newValues[field] = value;
    }

    // 3. Buat request pending kalau ada field approval yang berubah.
    let pendingRequest = null;
    if (Object.keys(newValues).length > 0) {
      const existing = await findActivePendingProfileUpdate(walletAddress, trx);
      if (existing) {
        throw new Error(ProfileUpdateError.PENDING_REQUEST_EXISTS);
      }
      pendingRequest = await createProfileUpdateRequest(walletAddress, oldValues, newValues, trx);
    }

    return { user: updatedUser, pendingRequest };
  });
}

module.exports = {
  ProfileUpdateError,
  submitProfileUpdateRequest,
};
