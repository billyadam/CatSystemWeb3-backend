const express = require('express');
const cors = require('cors');
const authRouter = require('./routes/auth');
const authMiddleware = require('./middleware/auth');

const app = express();

app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/auth', authRouter);

// Protected route — returns the authenticated user's info
app.get('/me', authMiddleware, (req, res) => {
  res.json({ id: req.user.sub, wallet: req.user.wallet });
});

module.exports = app;
