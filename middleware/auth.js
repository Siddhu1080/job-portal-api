const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const asyncHandler = require('./asyncHandler');
const { AppError } = require('./errorHandler');

const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw new AppError('Authentication required. Provide a Bearer token', 401);
  }
  const token = header.split(' ')[1];

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    throw new AppError(
      err.name === 'TokenExpiredError' ? 'Token has expired. Please log in again' : 'Invalid token',
      401
    );
  }

  const user = await User.findById(decoded.id);
  if (!user) throw new AppError('The user for this token no longer exists', 401);

  req.user = user;
  next();
});

const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new AppError(`Access denied: only ${roles.join(' or ')} users can perform this action`, 403));
  }
  next();
};

module.exports = { protect, authorize };
