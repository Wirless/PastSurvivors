const mongoose = require('mongoose');

const ItemSchema = new mongoose.Schema({
  itemId: {
    type: String,
    required: [true, 'Please add an item ID'],
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: [true, 'Please add an item name'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  description: {
    type: String,
    required: [true, 'Please add a description'],
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  type: {
    type: String,
    required: [true, 'Please specify the item type'],
    enum: [
      'weapon', 
      'armor', 
      'consumable', 
      'resource', 
      'quest',
      'accessory'
    ]
  },
  subType: {
    type: String,
    enum: [
      'head', 
      'body', 
      'hands', 
      'legs', 
      'feet', 
      'melee', 
      'ranged',
      'food',
      'drink',
      'medicine',
      'material',
      'valuable',
      'tool',
      null
    ],
    default: null
  },
  rarity: {
    type: String,
    enum: ['common', 'uncommon', 'rare', 'epic', 'legendary'],
    default: 'common'
  },
  stats: {
    damage: {
      type: Number,
      default: 0
    },
    defense: {
      type: Number,
      default: 0
    },
    radiationResistance: {
      type: Number,
      default: 0
    },
    healthBonus: {
      type: Number,
      default: 0
    },
    hungerRestore: {
      type: Number,
      default: 0
    },
    thirstRestore: {
      type: Number,
      default: 0
    },
    radiationEffect: {
      type: Number,
      default: 0
    }
  },
  value: {
    type: Number,
    default: 0
  },
  weight: {
    type: Number,
    default: 1,
    min: 0
  },
  stackable: {
    type: Boolean,
    default: false
  },
  maxStack: {
    type: Number,
    default: 1
  },
  image: {
    type: String,
    default: 'default-item.png'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Item', ItemSchema); 