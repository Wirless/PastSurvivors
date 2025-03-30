const Character = require('../models/Character');

// Check if user has created a character
exports.checkCharacterCreated = async (req, res, next) => {
  try {
    const character = await Character.findOne({ user: req.user.id });

    if (!character) {
      return res.redirect('/character/create');
    }

    req.character = character;
    next();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Check if user has not created a character
exports.checkCharacterNotCreated = async (req, res, next) => {
  try {
    const character = await Character.findOne({ user: req.user.id });

    if (character) {
      return res.redirect('/dashboard');
    }

    next();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};