const Character = require('../models/Character');
const User = require('../models/User');

// @desc    Create character
// @route   POST /api/character
// @access  Private
exports.createCharacter = async (req, res) => {
  try {
    const { name, stats } = req.body;

    // Validate stats distribution - total should be 25 points
    const totalStats = Object.values(stats).reduce((sum, stat) => sum + stat, 0);
    
    if (totalStats !== 25) {
      return res.status(400).json({
        success: false,
        message: 'Total stats must equal 25 points'
      });
    }

    // Check if user already has a character
    const existingCharacter = await Character.findOne({ user: req.user.id });
    
    if (existingCharacter) {
      return res.status(400).json({
        success: false,
        message: 'User already has a character'
      });
    }

    // Create character
    const character = await Character.create({
      name,
      stats,
      user: req.user.id
    });

    // Update user to indicate they have a character
    await User.findByIdAndUpdate(req.user.id, { hasCharacter: true });

    res.status(201).json({
      success: true,
      data: character
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Get user's character
// @route   GET /api/character
// @access  Private
exports.getCharacter = async (req, res) => {
  try {
    const character = await Character.findOne({ user: req.user.id });

    if (!character) {
      return res.status(404).json({
        success: false,
        message: 'No character found'
      });
    }

    res.status(200).json({
      success: true,
      data: character
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Update character
// @route   PUT /api/character
// @access  Private
exports.updateCharacter = async (req, res) => {
  try {
    let character = await Character.findOne({ user: req.user.id });

    if (!character) {
      return res.status(404).json({
        success: false,
        message: 'No character found'
      });
    }

    // Update character fields that are in the request
    character = await Character.findByIdAndUpdate(character.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: character
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
}; 