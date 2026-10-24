class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

const notFound = (req, res, next) =>
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  let status = 500;
  let message = 'Internal server error';

  if (err instanceof AppError) {
    status = err.statusCode;
    message = err.message;
  } else if (err.name === 'CastError') {
    status = 400;
    message = `Invalid value for ${err.path}`;
  } else if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join(', ');
  } else if (err.code === 11000) {
    status = 409;
    const keys = Object.keys(err.keyPattern || {});
    if (keys.includes('job') && keys.includes('candidate')) message = 'You have already applied to this job';
    else if (keys.includes('email')) message = 'Email is already registered';
    else message = 'Duplicate value';
  } else if (err.name === 'TokenExpiredError') {
    status = 401;
    message = 'Token has expired. Please log in again';
  } else if (err.name === 'JsonWebTokenError') {
    status = 401;
    message = 'Invalid token';
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Invalid JSON in request body';
  } else if (err.status && err.status < 500) {
    status = err.status;
    message = err.message;
  } else {
    console.error(err);
  }

  res.status(status).json({ success: false, message });
};

module.exports = { AppError, notFound, errorHandler };
