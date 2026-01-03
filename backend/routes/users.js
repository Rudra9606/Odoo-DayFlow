const express = require('express');
const router = express.Router();
const { 
  getUsers, 
  getUserById, 
  createUser, 
  updateUser, 
  deleteUser 
} = require('../controllers/userController');

// @route   GET /api/users
// @desc    Get all users
router.get('/', getUsers);

// @route   GET /api/users/:id
// @desc    Get user by ID
router.get('/:id', getUserById);

// @route   POST /api/users
// @desc    Create new user
router.post('/', createUser);

// @route   PUT /api/users/:id
// @desc    Update user
router.put('/:id', updateUser);

// @route   DELETE /api/users/:id
// @desc    Delete user
router.delete('/:id', deleteUser);

module.exports = router;
