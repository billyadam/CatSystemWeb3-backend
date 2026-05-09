const jwksClient = require('jwks-rsa');
const jwt = require('jsonwebtoken');
const { PrivyClient } = require('@privy-io/server-auth');

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
        resolve(decoded);
      }
    );
  });
}

// Fetches the full Privy user and returns the Solana wallet address.
// External wallets (e.g. Phantom) are not in the JWT — they require an API call.
async function getWalletAddress(privyUserId) {
  const privy = new PrivyClient(process.env.PRIVY_APP_ID, process.env.PRIVY_APP_SECRET);

  let user;
  try {
    user = await privy.getUser(privyUserId);
  } catch (err) {
    throw new Error(`Failed to fetch Privy user: ${err.message}`);
  }

  const wallet = (user.linkedAccounts || []).find(
    (a) => a.type === 'wallet' && a.chainType === 'solana'
  );

  if (!wallet?.address) {
    throw new Error(`No Solana wallet linked to Privy user ${privyUserId}`);
  }

  return wallet.address;
}

module.exports = { verifyPrivyToken, getWalletAddress };
