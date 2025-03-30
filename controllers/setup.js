const User = require('../models/User');
const Character = require('../models/Character');
const Item = require('../models/Item');
const fs = require('fs').promises;
const path = require('path');

// Function to create an admin user if one doesn't exist
const setupAdminUser = async () => {
  try {
    // Check if admin user already exists
    const adminUser = await User.findOne({ role: 'admin' });
    
    if (!adminUser) {
      // Create admin user
      const admin = await User.create({
        username: 'admin',
        email: 'admin@admin.pl',
        password: 'maniekk', // You should use a secure password in production
        role: 'admin'
      });
      
      console.log('Admin user created:', admin.email);
    } else {
      console.log('Admin user already exists:', adminUser.email);
    }
  } catch (error) {
    console.error('Error setting up admin user:', error);
  }
};

// Function to populate database with items from items.json
const setupItems = async () => {
  try {
    console.log('Setting up game items...');
    
    // Read items from JSON file
    const itemsPath = path.join(__dirname, '../public/js/items.json');
    const itemsData = await fs.readFile(itemsPath, 'utf8');
    const itemsJson = JSON.parse(itemsData);
    
    // Track item counts
    let existingCount = 0;
    let createdCount = 0;
    
    // Process each item
    for (const itemData of itemsJson.items) {
      // Check if item already exists by itemId
      const existingItem = await Item.findOne({ itemId: itemData.itemId });
      
      if (!existingItem) {
        // Create new item
        await Item.create({
          itemId: itemData.itemId,
          name: itemData.name,
          description: itemData.description,
          type: itemData.type,
          subType: itemData.subType || null,
          rarity: itemData.rarity || 'common',
          stats: {
            damage: itemData.stats?.damage || 0,
            defense: itemData.stats?.defense || 0,
            radiationResistance: itemData.stats?.radiationResistance || 0,
            healthBonus: itemData.stats?.healthBonus || 0,
            hungerRestore: itemData.stats?.hungerRestore || 0,
            thirstRestore: itemData.stats?.thirstRestore || 0,
            radiationEffect: itemData.stats?.radiationEffect || 0
          },
          value: itemData.value || 0,
          weight: itemData.weight || 1,
          stackable: itemData.stackable || false,
          maxStack: itemData.maxStack || 1,
          image: itemData.image || '/images/items/default-item.png'
        });
        
        createdCount++;
      } else {
        // Update existing item with new data
        existingItem.name = itemData.name;
        existingItem.description = itemData.description;
        existingItem.type = itemData.type;
        existingItem.subType = itemData.subType || null;
        existingItem.rarity = itemData.rarity || 'common';
        existingItem.stats = {
          damage: itemData.stats?.damage || 0,
          defense: itemData.stats?.defense || 0,
          radiationResistance: itemData.stats?.radiationResistance || 0,
          healthBonus: itemData.stats?.healthBonus || 0,
          hungerRestore: itemData.stats?.hungerRestore || 0,
          thirstRestore: itemData.stats?.thirstRestore || 0,
          radiationEffect: itemData.stats?.radiationEffect || 0
        };
        existingItem.value = itemData.value || 0;
        existingItem.weight = itemData.weight || 1;
        existingItem.stackable = itemData.stackable || false;
        existingItem.maxStack = itemData.maxStack || 1;
        existingItem.image = itemData.image || '/images/items/default-item.png';
        
        await existingItem.save();
        existingCount++;
      }
    }
    
    console.log(`Items setup complete: ${createdCount} created, ${existingCount} updated`);
  } catch (error) {
    console.error('Error setting up items:', error);
  }
};

// Function to update existing accounts and characters with new fields/stats
const migrateExistingData = async () => {
  try {
    console.log('Checking for data migrations...');
    
    // 1. Update existing users with missing fields
    const usersToUpdate = await User.find({ role: { $exists: false } });
    if (usersToUpdate.length > 0) {
      console.log(`Found ${usersToUpdate.length} users that need role field added`);
      
      for (const user of usersToUpdate) {
        // Set default role to 'user'
        user.role = 'user';
        
        // Special case for admin email
        if (user.email === 'admin@admin.pl') {
          user.role = 'admin';
          console.log(`Set admin role for user: ${user.email}`);
        }
        
        await user.save();
      }
      console.log('User migrations completed');
    } else {
      console.log('No users need migration');
    }
    
    // 2. Update existing characters with missing fields
    const charactersToUpdate = await Character.find({ 
      $or: [
        { 'energy.current': { $exists: false } },
        { 'energy.max': { $exists: false } },
        { experience: { $exists: false } }
      ] 
    });
    
    if (charactersToUpdate.length > 0) {
      console.log(`Found ${charactersToUpdate.length} characters that need updating`);
      
      for (const character of charactersToUpdate) {
        let updated = false;
        
        // Add energy if missing
        if (!character.energy || !character.energy.current || !character.energy.max) {
          character.energy = { 
            current: 100, 
            max: 100 
          };
          updated = true;
        }
        
        // Add experience if missing
        if (character.experience === undefined) {
          character.experience = 0;
          updated = true;
        }
        
        if (updated) {
          await character.save();
          console.log(`Updated character: ${character.name}`);
        }
      }
      console.log('Character migrations completed');
    } else {
      console.log('No characters need migration');
    }
    
  } catch (error) {
    console.error('Error during data migration:', error);
  }
};

// Run all setup functions
const setupGame = async () => {
  try {
    await setupAdminUser();
    await setupItems();
    await migrateExistingData();
    console.log('Game setup completed successfully');
  } catch (error) {
    console.error('Error during game setup:', error);
  }
};

module.exports = {
  setupAdminUser,
  setupItems,
  migrateExistingData,
  setupGame
}; 