const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes
exports.protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // Set token from Bearer token in header
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.token) {
    // Set token from cookie
    token = req.cookies.token;
  }

  // Make sure token exists
  if (!token) {
    if (req.headers['content-type'] === 'application/json') {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    } else {
      return res.redirect('/login');
    }
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = await User.findById(decoded.id);

    next();
  } catch (err) {
    if (req.headers['content-type'] === 'application/json') {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    } else {
      return res.redirect('/login');
    }
  }
};

// Grant access to specific roles
exports.authorize = (role) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (req.user.role !== role) {
      if (req.headers['content-type'] === 'application/json') {
        return res.status(403).json({
          success: false,
          message: `User role ${req.user.role} is not authorized to access this route`
        });
      } else {
        return res.status(403).render('403', {
          title: 'Access Denied',
          message: 'You do not have permission to access this page.'
        });
      }
    }

    next();
  };
}; 