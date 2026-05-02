const { verify } = require('../utils/jwt');

module.exports = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing or invalid token' });
  }

  try {
    req.user = verify(header.slice(7));
    next();
  } catch {
    res.status(401).json({ message: 'Token expired or invalid' });
  }
};
