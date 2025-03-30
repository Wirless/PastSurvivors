const Character = require('../models/Character');
const Item = require('../models/Item');

// @desc    Get character inventory
// @route   GET /api/inventory
// @access  Private
exports.getInventory = async (req, res) => {
  try {
    const character = await Character.findOne({ user: req.user.id })
      .populate({
        path: 'inventory.item',
        model: 'Item'
      })
      .populate({
        path: 'equipment.head equipment.body equipment.hands equipment.legs equipment.feet equipment.weapon equipment.accessory',
        model: 'Item'
      });

    if (!character) {
      return res.status(404).json({
        success: false,
        message: 'Character not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        inventory: character.inventory,
        equipment: character.equipment,
        inventorySize: character.inventorySize
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Add item to inventory
// @route   POST /api/inventory/add
// @access  Private
exports.addItemToInventory = async (req, res) => {
  try {
    const { itemId, quantity = 1 } = req.body;

    // Find character
    let character = await Character.findOne({ user: req.user.id });

    if (!character) {
      return res.status(404).json({
        success: false,
        message: 'Character not found'
      });
    }

    // Find item
    const item = await Item.findById(itemId);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    // Check if inventory is full
    if (character.inventory.length >= character.inventorySize) {
      return res.status(400).json({
        success: false,
        message: 'Inventory is full'
      });
    }

    // If stackable, check if item already exists in inventory
    if (item.stackable) {
      const existingItemIndex = character.inventory.findIndex(
        i => i.item.toString() === itemId
      );

      if (existingItemIndex > -1) {
        character.inventory[existingItemIndex].quantity += quantity;
        
        // Check if over max stack size
        if (character.inventory[existingItemIndex].quantity > item.maxStack) {
          const overflow = character.inventory[existingItemIndex].quantity - item.maxStack;
          character.inventory[existingItemIndex].quantity = item.maxStack;
          
          // Create new stack with overflow
          if (character.inventory.length < character.inventorySize) {
            character.inventory.push({
              item: itemId,
              quantity: overflow
            });
          } else {
            return res.status(400).json({
              success: false,
              message: `Added ${quantity - overflow} items. Could not add ${overflow} more - inventory full`
            });
          }
        }
      } else {
        // Add new stack
        character.inventory.push({
          item: itemId,
          quantity: quantity
        });
      }
    } else {
      // Non-stackable item, add each as separate entry
      for (let i = 0; i < quantity; i++) {
        if (character.inventory.length < character.inventorySize) {
          character.inventory.push({
            item: itemId,
            quantity: 1
          });
        } else {
          return res.status(400).json({
            success: false,
            message: `Added ${i} items. Could not add ${quantity - i} more - inventory full`
          });
        }
      }
    }

    await character.save();

    res.status(200).json({
      success: true,
      message: `Added ${quantity} ${item.name} to inventory`,
      data: character.inventory
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Remove item from inventory
// @route   POST /api/inventory/remove
// @access  Private
exports.removeItemFromInventory = async (req, res) => {
  try {
    const { inventoryItemId, quantity = 1 } = req.body;

    // Find character
    let character = await Character.findOne({ user: req.user.id });

    if (!character) {
      return res.status(404).json({
        success: false,
        message: 'Character not found'
      });
    }

    // Find item in inventory
    const inventoryItemIndex = character.inventory.findIndex(
      i => i._id.toString() === inventoryItemId
    );

    if (inventoryItemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in inventory'
      });
    }

    const inventoryItem = character.inventory[inventoryItemIndex];

    // If quantity to remove is greater than or equal to quantity in inventory, remove item
    if (quantity >= inventoryItem.quantity) {
      character.inventory.splice(inventoryItemIndex, 1);
    } else {
      // Otherwise, reduce quantity
      character.inventory[inventoryItemIndex].quantity -= quantity;
    }

    await character.save();

    res.status(200).json({
      success: true,
      message: 'Item removed from inventory',
      data: character.inventory
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Equip item
// @route   POST /api/inventory/equip
// @access  Private
exports.equipItem = async (req, res) => {
  try {
    const { inventoryItemId } = req.body;

    // Find character
    let character = await Character.findOne({ user: req.user.id });

    if (!character) {
      return res.status(404).json({
        success: false,
        message: 'Character not found'
      });
    }

    // Find item in inventory
    const inventoryItemIndex = character.inventory.findIndex(
      i => i._id.toString() === inventoryItemId
    );

    if (inventoryItemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in inventory'
      });
    }

    // Get the item details
    const itemId = character.inventory[inventoryItemIndex].item;
    const item = await Item.findById(itemId);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    // Determine equipment slot based on item type and subType
    let slot;
    if (item.type === 'weapon') {
      slot = 'weapon';
    } else if (item.type === 'armor') {
      slot = item.subType; // head, body, hands, legs, feet
    } else if (item.type === 'accessory') {
      slot = 'accessory';
    } else {
      return res.status(400).json({
        success: false,
        message: 'This item cannot be equipped'
      });
    }

    // Check if an item is already equipped in that slot
    if (character.equipment[slot]) {
      // Add currently equipped item back to inventory
      character.inventory.push({
        item: character.equipment[slot],
        quantity: 1
      });
    }

    // Equip the new item
    character.equipment[slot] = itemId;

    // Remove item from inventory
    if (character.inventory[inventoryItemIndex].quantity > 1) {
      character.inventory[inventoryItemIndex].quantity -= 1;
    } else {
      character.inventory.splice(inventoryItemIndex, 1);
    }

    await character.save();

    res.status(200).json({
      success: true,
      message: `${item.name} equipped`,
      data: {
        inventory: character.inventory,
        equipment: character.equipment
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Unequip item
// @route   POST /api/inventory/unequip
// @access  Private
exports.unequipItem = async (req, res) => {
  try {
    const { slot } = req.body;

    // Find character
    let character = await Character.findOne({ user: req.user.id });

    if (!character) {
      return res.status(404).json({
        success: false,
        message: 'Character not found'
      });
    }

    // Check if slot is valid
    if (!['head', 'body', 'hands', 'legs', 'feet', 'weapon', 'accessory'].includes(slot)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid equipment slot'
      });
    }

    // Check if an item is equipped in that slot
    if (!character.equipment[slot]) {
      return res.status(400).json({
        success: false,
        message: 'No item equipped in this slot'
      });
    }

    // Check if inventory has space
    if (character.inventory.length >= character.inventorySize) {
      return res.status(400).json({
        success: false,
        message: 'Cannot unequip - inventory is full'
      });
    }

    // Add equipped item to inventory
    character.inventory.push({
      item: character.equipment[slot],
      quantity: 1
    });

    // Remove item from equipment slot
    character.equipment[slot] = null;

    await character.save();

    res.status(200).json({
      success: true,
      message: 'Item unequipped',
      data: {
        inventory: character.inventory,
        equipment: character.equipment
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Get item details by inventory ID
// @route   GET /api/inventory/item/:id
// @access  Private
exports.getItemById = async (req, res) => {
  try {
    const { id } = req.params;

    // Find character
    const character = await Character.findOne({ user: req.user.id });

    if (!character) {
      return res.status(404).json({
        success: false,
        message: 'Character not found'
      });
    }

    // Find item in inventory
    const inventoryItem = character.inventory.find(
      item => item._id.toString() === id
    );

    if (!inventoryItem) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in inventory'
      });
    }

    // Get full item details
    const item = await Item.findById(inventoryItem.item);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item details not found'
      });
    }

    res.status(200).json({
      success: true,
      data: item
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Get equipped item details by slot
// @route   GET /api/inventory/equipped/:slot
// @access  Private
exports.getEquippedItemBySlot = async (req, res) => {
  try {
    const { slot } = req.params;

    // Validate slot
    if (!['head', 'body', 'hands', 'legs', 'feet', 'weapon', 'accessory'].includes(slot)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid equipment slot'
      });
    }

    // Find character
    const character = await Character.findOne({ user: req.user.id });

    if (!character) {
      return res.status(404).json({
        success: false,
        message: 'Character not found'
      });
    }

    // Check if an item is equipped in that slot
    if (!character.equipment[slot]) {
      return res.status(404).json({
        success: false,
        message: 'No item equipped in this slot'
      });
    }

    // Get full item details
    const item = await Item.findById(character.equipment[slot]);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item details not found'
      });
    }

    res.status(200).json({
      success: true,
      data: item
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Use consumable item
// @route   POST /api/inventory/use
// @access  Private
exports.useItem = async (req, res) => {
  try {
    const { inventoryItemId } = req.body;

    // Find character
    let character = await Character.findOne({ user: req.user.id });

    if (!character) {
      return res.status(404).json({
        success: false,
        message: 'Character not found'
      });
    }

    // Find item in inventory
    const inventoryItemIndex = character.inventory.findIndex(
      i => i._id.toString() === inventoryItemId
    );

    if (inventoryItemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in inventory'
      });
    }

    // Get the item details
    const itemId = character.inventory[inventoryItemIndex].item;
    const item = await Item.findById(itemId);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    // Check if item is consumable
    if (item.type !== 'consumable') {
      return res.status(400).json({
        success: false,
        message: 'This item cannot be used'
      });
    }

    // Apply item effects
    const effects = {
      health: 0,
      hunger: 0,
      thirst: 0,
      radiation: 0
    };

    // Special handling for specific items
    if (item.itemId === 'rat_meat') {
      // Rat meat: +5 health, +1 radiation
      const newHealth = Math.min(character.health.current + 5, character.health.max);
      effects.health = newHealth - character.health.current;
      character.health.current = newHealth;
      
      character.radiation = Math.min(character.radiation + 1, 100);
      effects.radiation = 1;
    } 
    else if (item.itemId === 'dirty_water') {
      // Dirty water: +10 thirst, +2 radiation
      const newThirst = Math.min(character.thirst + 10, 100);
      effects.thirst = newThirst - character.thirst;
      character.thirst = newThirst;
      
      character.radiation = Math.min(character.radiation + 2, 100);
      effects.radiation = 2;
    }
    else if (item.itemId === 'clean_water') {
      // Clean water: +20 thirst, +5 health, 0 radiation
      const newThirst = Math.min(character.thirst + 20, 100);
      effects.thirst = newThirst - character.thirst;
      character.thirst = newThirst;
      
      const newHealth = Math.min(character.health.current + 5, character.health.max);
      effects.health = newHealth - character.health.current;
      character.health.current = newHealth;
    }
    else {
      // Apply standard effects from item stats
      // Apply health restoration
      if (item.stats.healthBonus > 0) {
        const newHealth = Math.min(character.health.current + item.stats.healthBonus, character.health.max);
        effects.health = newHealth - character.health.current;
        character.health.current = newHealth;
      }

      // Apply hunger restoration
      if (item.stats.hungerRestore > 0) {
        const newHunger = Math.min(character.hunger + item.stats.hungerRestore, 100);
        effects.hunger = newHunger - character.hunger;
        character.hunger = newHunger;
      }

      // Apply thirst restoration
      if (item.stats.thirstRestore > 0) {
        const newThirst = Math.min(character.thirst + item.stats.thirstRestore, 100);
        effects.thirst = newThirst - character.thirst;
        character.thirst = newThirst;
      }

      // Apply radiation effect (positive or negative)
      if (item.stats.radiationEffect !== 0) {
        const newRadiation = Math.max(0, Math.min(character.radiation - item.stats.radiationEffect, 100));
        effects.radiation = character.radiation - newRadiation;
        character.radiation = newRadiation;
      }
    }

    // Remove item from inventory
    if (character.inventory[inventoryItemIndex].quantity > 1) {
      character.inventory[inventoryItemIndex].quantity -= 1;
    } else {
      character.inventory.splice(inventoryItemIndex, 1);
    }

    // Update last action timestamp
    character.lastAction = Date.now();

    await character.save();

    res.status(200).json({
      success: true,
      message: `Used ${item.name}`,
      data: {
        effects,
        character: {
          health: character.health,
          hunger: character.hunger,
          thirst: character.thirst,
          radiation: character.radiation
        },
        inventory: character.inventory
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Get all items
// @route   GET /api/inventory/items
// @access  Private
exports.getAllItems = async (req, res) => {
  try {
    const items = await Item.find({});

    res.status(200).json({
      success: true,
      data: items
    });
  } catch (err) {
    console.error('Error fetching all items:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
}; 