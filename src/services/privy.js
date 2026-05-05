const jwksClient = require('jwks-rsa');
const jwt = require('jsonwebtoken');

const client = jwksClient({
  jwksUri: `https://auth.privy.io/api/v1/apps/${process.env.PRIVY_APP_ID}/jwks.json`,
  cache: true,
  cacheMaxAge: 10 * 60 * 1000,
  rateLimit: true,
});

function getSigningKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    callback(null, key.getPublicKey());
  });
}

// Verifies the Privy JWT: signature (via JWKS), issuer, audience, and expiry.
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

        // Debug: log decoded token structure to verify linked_accounts shape
        console.debug('[privy] decoded token:', JSON.stringify(decoded, null, 2));

        resolve(decoded);
      }
    );
  });
}

// Extracts the wallet address from the verified Privy token.
//
// Wallet is REQUIRED. We do not fall back to Google or email identity.
// This app uses wallet address as the sole identity for signing operations.
//
// Wallet is guaranteed to be present because:
//   - Privy embedded wallets are ENABLED in our app config
//   - Privy provisions a wallet for every user on first login,
//     including Google OAuth users
//
// If wallet is missing, it means embedded wallets are disabled or
// Privy's provisioning failed — both are misconfigurations we must reject.
function extractWalletAddress(decoded) {
  const accounts = decoded.linked_accounts || [];
  const wallet = accounts.find((a) => a.type === 'wallet');

  if (!wallet?.address) {
    // This should never happen with embedded wallets enabled.
    // If it does, check your Privy dashboard: Settings → Embedded Wallets.
    throw new Error('No wallet found in Privy token. Ensure embedded wallets are enabled in your Privy app.');
  }

  return wallet.address;
}

module.exports = { verifyPrivyToken, extractWalletAddress };
