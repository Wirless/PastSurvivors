const mongoose = require('mongoose');
require('dotenv').config();

const Item = require('./models/Item');

const seedItems = [
  {
    name: 'Rusty Knife',
    description: 'A rusty knife. Not very effective, but better than nothing.',
    type: 'weapon',
    subType: 'melee',
    rarity: 'common',
    stats: {
      damage: 5
    },
    value: 10,
    weight: 1,
    image: 'default-item.png'
  },
  {
    name: 'Leather Jacket',
    description: 'A worn leather jacket. Provides minimal protection.',
    type: 'armor',
    subType: 'body',
    rarity: 'common',
    stats: {
      defense: 5,
      radiationResistance: 2
    },
    value: 15,
    weight: 3,
    image: 'default-item.png'
  },
  {
    name: 'Canned Beans',
    description: 'A dented can of beans. Fills your stomach.',
    type: 'consumable',
    subType: 'food',
    rarity: 'common',
    stats: {
      hungerRestore: 20
    },
    value: 5,
    weight: 0.5,
    stackable: true,
    maxStack: 5,
    image: 'default-item.png'
  },
  {
    name: 'Purified Water',
    description: 'A bottle of purified water. Quenches thirst without radiation.',
    type: 'consumable',
    subType: 'drink',
    rarity: 'uncommon',
    stats: {
      thirstRestore: 30
    },
    value: 10,
    weight: 0.5,
    stackable: true,
    maxStack: 5,
    image: 'default-item.png'
  },
  {
    name: 'RadAway',
    description: 'A chemical solution that removes radiation from the body.',
    type: 'consumable',
    subType: 'medicine',
    rarity: 'uncommon',
    stats: {
      radiationEffect: 15
    },
    value: 25,
    weight: 0.2,
    stackable: true,
    maxStack: 3,
    image: 'default-item.png'
  },
  {
    name: 'Scrap Metal',
    description: 'Some scrap metal. Useful for crafting.',
    type: 'resource',
    subType: 'material',
    rarity: 'common',
    value: 2,
    weight: 0.5,
    stackable: true,
    maxStack: 20,
    image: 'default-item.png'
  },
  {
    name: 'Gas Mask',
    description: 'A gas mask that protects against airborne radiation.',
    type: 'armor',
    subType: 'head',
    rarity: 'uncommon',
    stats: {
      defense: 2,
      radiationResistance: 10
    },
    value: 30,
    weight: 1,
    image: 'default-item.png'
  },
  {
    name: 'Combat Boots',
    description: 'Sturdy combat boots that protect your feet.',
    type: 'armor',
    subType: 'feet',
    rarity: 'common',
    stats: {
      defense: 3
    },
    value: 12,
    weight: 1.5,
    image: 'default-item.png'
  },
  {
    name: 'Leather Gloves',
    description: 'Protective leather gloves.',
    type: 'armor',
    subType: 'hands',
    rarity: 'common',
    stats: {
      defense: 2
    },
    value: 8,
    weight: 0.5,
    image: 'default-item.png'
  },
  {
    name: 'Tattered Jeans',
    description: 'A pair of tattered jeans. Better than nothing.',
    type: 'armor',
    subType: 'legs',
    rarity: 'common',
    stats: {
      defense: 2
    },
    value: 5,
    weight: 1,
    image: 'default-item.png'
  }
];

async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Delete existing items
    await Item.deleteMany({});
    console.log('Deleted existing items');

    // Insert new items
    const createdItems = await Item.insertMany(seedItems);
    console.log(`Added ${createdItems.length} items to the database`);

    console.log('Database seeded successfully');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding database:', err);
    process.exit(1);
  }
}

seedDatabase(); 