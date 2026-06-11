const path = require('path');
const express = require('express');
const cors = require('cors');
const authRouter = require('./routes/public/auth');
const usersRouter = require('./routes/user/users');
const catsRouter = require('./routes/user/cats');
const adminRouter = require('./routes/admin/admin');
const requestRouter = require('./routes/admin/request');

const app = express();


const allowedOrigins = process.env.ALLOWED_ORIGIN
  ? process.env.ALLOWED_ORIGIN.split(',')
  : ['http://localhost:3000', 'http://localhost:3005'];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  credentials: true,
};
app.use(cors(corsOptions));
app.options('/', cors(corsOptions));


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Public
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});
app.use('/auth', authRouter);

// User
app.use('/users', usersRouter);
app.use('/cats', catsRouter);

// Admin
app.use('/admin', adminRouter);
app.use('/admin/requests', requestRouter);

module.exports = app;
