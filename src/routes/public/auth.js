const express = require('express');
const { verifyPrivyToken, getWalletAddress } = require('../services/privy');
const { signAccessToken } = require('../services/jwt');
const { findByWallet: findAdminByWallet } = require('../repositories/adminRepository');

const { findOrCreate } = require('../db');


const router = express.Router();

// POST /auth/web3
// Body: { token: string } — Privy JWT from the frontend
router.post('/web3', async (req, res) => {
  const { token } = req.body;

  console.log('[auth] Received token:', token ? `${token.substring(0, 30)}...` : 'undefined');

  if (!token) {
    return res.status(400).json({ message: 'token is required' });
  }

  // 1. Verify Privy JWT: signature, issuer, audience, expiry
  let decoded;
  try {
    decoded = await verifyPrivyToken(token);
  } catch (err) {
    console.warn('[auth] Privy token verification failed:', err.message);
    return res.status(401).json({ message: 'Invalid or expired Privy token' });
  }

  // 2. Fetch wallet address from Privy user record (supports external wallets like Phantom)
  let walletAddress;
  try {
    walletAddress = await getWalletAddress(decoded.sub);
  } catch (err) {
    console.error('[auth] Wallet lookup failed:', err.message);
    return res.status(400).json({ message: err.message });
  }


  // 3. Find or create user keyed by wallet address
  const user = findOrCreate({ privyId: decoded.sub, wallet: walletAddress });



  // 4. Issue short-lived access token (wallet_address is the user ID)
  const accessToken = signAccessToken({
    sub: user.id,
    wallet: user.wallet,
  });

  console.log(`[auth] Authenticated wallet=${walletAddress}`);

  return res.json({ accessToken });
});

// POST /auth/admin/web3
router.post('/admin/web3', async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ message: 'token is required' });
  }

  let decoded;
  try {
    decoded = await verifyPrivyToken(token);
  } catch (err) {
    console.warn('[auth/admin] Privy token verification failed:', err.message);
    return res.status(401).json({ message: 'Invalid or expired Privy token' });
  }

  let walletAddress;
  try {
    walletAddress = await getWalletAddress(decoded.sub);
  } catch (err) {
    console.error('[auth/admin] Wallet lookup failed:', err.message);
    return res.status(400).json({ message: err.message });
  }

  const admin = await findAdminByWallet(walletAddress);
  if (!admin) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const accessToken = signAccessToken({
    sub: walletAddress,
    wallet: walletAddress,
    role: 'admin',
  });

  console.log(`[auth/admin] Authenticated admin wallet=${walletAddress}`);

  return res.json({ accessToken });
});

module.exports = router;
