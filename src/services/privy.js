const jwksClient = require('jwks-rsa');
const jwt = require('jsonwebtoken');

// Privy publishes its public keys at this JWKS endpoint
const client = jwksClient({
  jwksUri: `https://auth.privy.io/api/v1/apps/${process.env.PRIVY_APP_ID}/jwks.json`,
  cache: true,
  cacheMaxAge: 10 * 60 * 1000, // 10 minutes
  rateLimit: true,
});

function getSigningKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    callback(null, key.getPublicKey());
  });
}

/**
 * Verifies a Privy-issued JWT:
 * - signature validated via JWKS
 * - issuer and audience checked
 * - expiry enforced by jsonwebtoken
 */
async function verifyPrivyToken(token) {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getSigningKey,
      {
        issuer: process.env.PRIVY_ISSUER,
        audience: process.env.PRIVY_APP_ID,
      },
      (err, decoded) => {
        if (err) return reject(err);
        resolve(decoded);
      }
    );
  });
}

/**
 * Extracts wallet address from decoded Privy token.
 * Prefers Solana wallets for this project; falls back to any wallet type.
 * NEVER trusts wallet address from request body — only from the verified token.
 */
function extractWalletAddress(decoded) {
  const accounts = decoded.linked_accounts || [];

  const wallet =
    accounts.find((a) => a.type === 'wallet' && a.chain_type === 'solana') ||
    accounts.find((a) => a.type === 'wallet');

  if (!wallet?.address) {
    throw new Error('No wallet address found in Privy token');
  }

  return wallet.address;
}

module.exports = { verifyPrivyToken, extractWalletAddress };
