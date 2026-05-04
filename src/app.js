const express = require('express');
const authRouter = require('./routes/auth');
const authMiddleware = require('./middleware/auth');

const app = express();

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
