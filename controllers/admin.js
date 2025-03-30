const asyncHandler = require('express-async-handler');
const path = require('path');
const fs = require('fs').promises;
const User = require('../models/User');

// @desc    Get admin statistics
// @route   GET /api/admin/stats
// @access  Private/Admin
exports.getAdminStats = asyncHandler(async (req, res) => {
  // Count users with characters
  const playerCount = await User.countDocuments({ hasCharacter: true });
  
  res.status(200).json({
    success: true,
    data: {
      playerCount
    }
  });
});

// @desc    Reload game data cache
// @route   POST /api/admin/reload-cache
// @access  Private/Admin
exports.reloadCache = asyncHandler(async (req, res) => {
  try {
    // In a real app, this would clear any cached data and reload from database
    // For this example, we'll just return success
    
    res.status(200).json({
      success: true,
      message: 'Cache reloaded successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Grant admin privileges to user
// @route   POST /api/admin/grant-admin
// @access  Private/Admin
exports.grantAdminPrivileges = asyncHandler(async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({
      success: false,
      message: 'Please provide an email address'
    });
  }
  
  const user = await User.findOne({ email });
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }
  
  user.role = 'admin';
  await user.save();
  
  res.status(200).json({
    success: true,
    message: `Admin privileges granted to ${user.username}`
  });
}); 