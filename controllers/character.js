const Character = require('../models/Character');
const User = require('../models/User');
const asyncHandler = require('express-async-handler');

// @desc    Create character
// @route   POST /api/character
// @access  Private
exports.createCharacter = asyncHandler(async (req, res) => {
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
});

// @desc    Get user's character
// @route   GET /api/character
// @access  Private
exports.getCharacter = asyncHandler(async (req, res) => {
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
});

// @desc    Update character
// @route   PUT /api/character
// @access  Private
exports.updateCharacter = asyncHandler(async (req, res) => {
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
});

// @desc    Update character energy when resting
// @route   POST /api/character/updateEnergy
// @access  Private
exports.updateCharacterEnergy = asyncHandler(async (req, res) => {
  const { amount } = req.body;
  
  if (!amount || isNaN(amount) || amount <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid energy amount'
    });
  }
  
  // Get character
  const character = await Character.findOne({ user: req.user.id });
  
  if (!character) {
    return res.status(404).json({
      success: false,
      message: 'Character not found'
    });
  }
  
  // Update energy (but don't exceed max)
  const newEnergy = Math.min(character.energy.current + amount, character.energy.max);
  character.energy.current = newEnergy;
  
  await character.save();
  
  res.status(200).json({
    success: true,
    data: {
      message: `Added ${amount} energy points`,
      energy: character.energy
    }
  });
}); 