const mongoose = require('mongoose');

const CharacterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a character name'],
    trim: true,
    maxlength: [30, 'Name cannot be more than 30 characters']
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  stats: {
    strength: {
      type: Number,
      required: true,
      min: 1,
      max: 10
    },
    agility: {
      type: Number,
      required: true,
      min: 1,
      max: 10
    },
    endurance: {
      type: Number,
      required: true,
      min: 1,
      max: 10
    },
    intelligence: {
      type: Number,
      required: true,
      min: 1,
      max: 10
    },
    luck: {
      type: Number,
      required: true,
      min: 1,
      max: 10
    }
  },
  experience: {
    type: Number,
    default: 0
  },
  energy: {
    current: {
      type: Number,
      default: 100
    },
    max: {
      type: Number,
      default: 100
    }
  },
  health: {
    current: {
      type: Number,
      default: 100
    },
    max: {
      type: Number,
      default: 100
    }
  },
  hunger: {
    type: Number,
    default: 100,
    min: 0,
    max: 100
  },
  thirst: {
    type: Number,
    default: 100,
    min: 0,
    max: 100
  },
  radiation: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  recoveryUntil: {
    type: Date,
    default: null
  },
  equipment: {
    head: {
      type: mongoose.Schema.ObjectId,
      ref: 'Item',
      default: null
    },
    body: {
      type: mongoose.Schema.ObjectId,
      ref: 'Item',
      default: null
    },
    hands: {
      type: mongoose.Schema.ObjectId,
      ref: 'Item',
      default: null
    },
    legs: {
      type: mongoose.Schema.ObjectId,
      ref: 'Item',
      default: null
    },
    feet: {
      type: mongoose.Schema.ObjectId,
      ref: 'Item',
      default: null
    },
    weapon: {
      type: mongoose.Schema.ObjectId,
      ref: 'Item',
      default: null
    },
    accessory: {
      type: mongoose.Schema.ObjectId,
      ref: 'Item',
      default: null
    }
  },
  inventory: [{
    item: {
      type: mongoose.Schema.ObjectId,
      ref: 'Item'
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1
    }
  }],
  inventorySize: {
    type: Number,
    default: 20,
    max: 20
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastAction: {
    type: Date,
    default: Date.now
  }
});

// Calculate health based on endurance when creating a character
CharacterSchema.pre('save', function(next) {
  if (this.isNew) {
    // Base health is 100, each point of endurance adds 10 health
    this.health.max = 100 + (this.stats.endurance - 5) * 10;
    this.health.current = this.health.max;
  }
  next();
});

// Virtual property to check if character is in recovery mode
CharacterSchema.virtual('isRecovering').get(function() {
  if (!this.recoveryUntil) return false;
  return new Date() < this.recoveryUntil;
});

// Make virtuals appear in JSON
CharacterSchema.set('toJSON', { virtuals: true });
CharacterSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Character', CharacterSchema); 