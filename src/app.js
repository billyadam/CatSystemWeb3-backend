const express = require('express');
const cors = require('cors');
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const authMiddleware = require('./middleware/auth');
const { findByWallet } = require('./repositories/userRepository');

const app = express();


const corsOptions = {
  origin: process.env.ALLOWED_ORIGIN || 'http://localhost:3000',
  credentials: true,
};
app.use(cors(corsOptions));
app.options('/', cors(corsOptions));


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  console.log("health")
  res.json({ status: 'ok' });
});

app.use('/auth', authRouter);
app.use('/users', usersRouter);

// Protected route — returns the authenticated user's info
app.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await findByWallet(req.user.wallet);

    res.json({ 
      id: req.user.sub, 
      wallet: req.user.wallet,
      user_data: user
    });
  } catch {
    return res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = app;
