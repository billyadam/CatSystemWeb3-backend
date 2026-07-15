const {
  findByWallet,
  APPROVAL_FIELDS,
  findActivePendingProfileUpdate,
  createProfileUpdateRequest,
  approveProfileUpdate,
  rejectProfileUpdate,
} = require('../repositories/userRepository');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Domain errors thrown by this service. Route layer maps these to HTTP status.
 */
const ProfileUpdateError = {
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  NO_FIELDS: 'NO_FIELDS',
  NO_CHANGES: 'NO_CHANGES',
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
 * Submit a profile update request for approval-gated fields
 * (name, phone_number, email, country, city).
 *
 * Stores before/after values in `request_profile_updates` with status pending.
 * Does NOT change the user directly.
 *
 * @param {string} walletAddress
 * @param {object} payload raw request body
 * @returns {Promise<object>} the created request row
 * @throws {Error} with message from ProfileUpdateError
 */
async function submitProfileUpdateRequest(walletAddress, payload) {
  const requested = normalizePayload(payload);

  if (Object.keys(requested).length === 0) {
    throw new Error(ProfileUpdateError.NO_FIELDS);
  }

  if (requested.email && !EMAIL_REGEX.test(requested.email)) {
    throw new Error(ProfileUpdateError.INVALID_EMAIL);
  }

  const user = await findByWallet(walletAddress);
  if (!user) {
    throw new Error(ProfileUpdateError.USER_NOT_FOUND);
  }

  // Keep only fields whose value actually differs from the current user value.
  const oldValues = {};
  const newValues = {};
  for (const [field, value] of Object.entries(requested)) {
    const current = user[field] ?? null;
    if (current === value) continue;
    oldValues[field] = current;
    newValues[field] = value;
  }

  if (Object.keys(newValues).length === 0) {
    throw new Error(ProfileUpdateError.NO_CHANGES);
  }

  const existing = await findActivePendingProfileUpdate(walletAddress);
  if (existing) {
    throw new Error(ProfileUpdateError.PENDING_REQUEST_EXISTS);
  }

  return createProfileUpdateRequest(walletAddress, oldValues, newValues);
}

/**
 * Approve a pending profile update request (admin action).
 */
async function approveProfileUpdateRequest(requestId, adminWallet) {
  return approveProfileUpdate(requestId, adminWallet);
}

/**
 * Reject a pending profile update request (admin action).
 */
async function rejectProfileUpdateRequest(requestId, adminWallet) {
  return rejectProfileUpdate(requestId, adminWallet);
}

module.exports = {
  ProfileUpdateError,
  submitProfileUpdateRequest,
  approveProfileUpdateRequest,
  rejectProfileUpdateRequest,
};
