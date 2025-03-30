const express = require('express');
const { 
  getInventory, 
  addItemToInventory, 
  removeItemFromInventory, 
  equipItem, 
  unequipItem, 
  useItem,
  getItemById,
  getEquippedItemBySlot 
} = require('../controllers/inventory');
const { protect } = require('../middleware/auth');
const { checkCharacterCreated } = require('../middleware/character');

const router = express.Router();

// All routes are protected
router.use(protect);
router.use(checkCharacterCreated);

router.get('/', getInventory);
router.get('/item/:id', getItemById);
router.get('/equipped/:slot', getEquippedItemBySlot);
router.post('/add', addItemToInventory);
router.post('/remove', removeItemFromInventory);
router.post('/equip', equipItem);
router.post('/unequip', unequipItem);
router.post('/use', useItem);

module.exports = router; 