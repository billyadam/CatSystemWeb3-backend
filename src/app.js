const path = require('path');
const express = require('express');
const cors = require('cors');
const authRouter = require('./routes/auth');
const uploadRouter = require('./routes/upload');
const authMiddleware = require('./middleware/auth');

const app = express();

const corsOptions = {
  origin: process.env.ALLOWED_ORIGIN || 'http://localhost:3000',
  credentials: true,
};
app.use(cors(corsOptions));
app.options('/', cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/health', (req, res) => {
  console.log("health")
  res.json({ status: 'ok' });
});

app.use('/auth', authRouter);
app.use('/upload', uploadRouter);

// Protected route — returns the authenticated user's info
app.get('/me', authMiddleware, (req, res) => {
  res.json({ id: req.user.sub, wallet: req.user.wallet });
});

module.exports = app;
