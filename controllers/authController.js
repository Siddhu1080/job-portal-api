const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const asyncHandler = require('../middleware/asyncHandler');
const { AppError } = require('../middleware/errorHandler');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '1d' });

exports.register = asyncHandler(async (req, res) => {
  const { name, email, password, role, companyName } = req.body;

  if (await User.findOne({ email: email.trim().toLowerCase() })) {
    throw new AppError('Email is already registered', 409);
  }

  const user = await User.create({
    name,
    email,
    password,
    role,
    companyName: role === 'employer' ? companyName : undefined,
  });

  res.status(201).json({ success: true, token: signToken(user._id), data: user });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid email or password', 401);
  }

  res.status(200).json({ success: true, token: signToken(user._id), data: user });
});

exports.getMe = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, data: req.user });
});
