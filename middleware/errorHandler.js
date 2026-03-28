const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode && res.statusCode !== 200 
    ? res.statusCode 
    : err.statusCode || 500;
  let message = err.message || 'Server Error';

  if (err.code === 11000) {
    message = `${Object.keys(err.keyValue)[0]} already exists`;
    statusCode = 400;
  }

  if (err.name === 'ValidationError') {
    message = Object.values(err.errors).map((e) => e.message).join(', ');
    statusCode = 400;
  }

  if (err.name === 'JsonWebTokenError') {
    message = 'Invalid token';
    statusCode = 401;
  }

  res.status(statusCode).json({ success: false, message });
};

module.exports = errorHandler;