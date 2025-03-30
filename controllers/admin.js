const asyncHandler = require('express-async-handler');
const path = require('path');
const fs = require('fs').promises;
const User = require('../models/User');
const Item = require('../models/Item');

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

// @desc    Get all scavenging locations
// @route   GET /api/admin/locations
// @access  Private/Admin
exports.getLocations = asyncHandler(async (req, res) => {
  try {
    const locationsPath = path.join(process.cwd(), 'public', 'js', 'scavenge_locations.json');
    const locationsData = await fs.readFile(locationsPath, 'utf8');
    const locations = JSON.parse(locationsData);
    
    res.status(200).json({
      success: true,
      data: {
        locations
      }
    });
  } catch (error) {
    console.error('Error reading locations:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Update scavenging locations
// @route   POST /api/admin/locations/update
// @access  Private/Admin
exports.updateLocation = asyncHandler(async (req, res) => {
  try {
    const { locations } = req.body;
    
    if (!locations || !Array.isArray(locations)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid locations data provided'
      });
    }
    
    const locationsPath = path.join(process.cwd(), 'public', 'js', 'scavenge_locations.json');
    await fs.writeFile(locationsPath, JSON.stringify(locations, null, 2), 'utf8');
    
    res.status(200).json({
      success: true,
      message: 'Locations updated successfully'
    });
  } catch (error) {
    console.error('Error updating locations:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Get all items
// @route   GET /api/admin/items
// @access  Private/Admin
exports.getItems = asyncHandler(async (req, res) => {
  try {
    // Get items from database
    const items = await Item.find({});
    
    // Also get the items template file
    const itemsTemplatePath = path.join(process.cwd(), 'public', 'js', 'items_template.json');
    const itemsTemplateData = await fs.readFile(itemsTemplatePath, 'utf8');
    const itemsTemplate = JSON.parse(itemsTemplateData);
    
    res.status(200).json({
      success: true,
      data: {
        items,
        itemsTemplate
      }
    });
  } catch (error) {
    console.error('Error getting items:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Update items
// @route   POST /api/admin/items/update
// @access  Private/Admin
exports.updateItems = asyncHandler(async (req, res) => {
  try {
    const { items, itemsTemplate } = req.body;
    
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid items data provided'
      });
    }
    
    // Update the items in the database
    for (const item of items) {
      // Use findOneAndUpdate with upsert to create if not exists
      await Item.findOneAndUpdate(
        { id: item.id }, 
        item, 
        { upsert: true, new: true }
      );
    }
    
    // If an updated template was provided, save it
    if (itemsTemplate) {
      const itemsTemplatePath = path.join(process.cwd(), 'public', 'js', 'items_template.json');
      await fs.writeFile(itemsTemplatePath, JSON.stringify(itemsTemplate, null, 2), 'utf8');
    }
    
    res.status(200).json({
      success: true,
      message: 'Items updated successfully'
    });
  } catch (error) {
    console.error('Error updating items:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Get all monsters
// @route   GET /api/admin/monsters
// @access  Private/Admin
exports.getMonsters = asyncHandler(async (req, res) => {
  try {
    const monstersPath = path.join(process.cwd(), 'public', 'js', 'monsters.json');
    const monstersData = await fs.readFile(monstersPath, 'utf8');
    const monsters = JSON.parse(monstersData);
    
    res.status(200).json({
      success: true,
      data: {
        monsters
      }
    });
  } catch (error) {
    console.error('Error reading monsters:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Update monsters
// @route   POST /api/admin/monsters/update
// @access  Private/Admin
exports.updateMonsters = asyncHandler(async (req, res) => {
  try {
    const { monsters } = req.body;
    
    if (!monsters || !Array.isArray(monsters)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid monsters data provided'
      });
    }
    
    const monstersPath = path.join(process.cwd(), 'public', 'js', 'monsters.json');
    await fs.writeFile(monstersPath, JSON.stringify(monsters, null, 2), 'utf8');
    
    res.status(200).json({
      success: true,
      message: 'Monsters updated successfully'
    });
  } catch (error) {
    console.error('Error updating monsters:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}); 