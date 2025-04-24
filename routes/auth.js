// Load environment variables from .env file
require('dotenv').config(); 

// Import required packages
const express = require('express');
const jwt = require('jsonwebtoken'); // For generating and verifying JWT tokens
const bcrypt = require('bcryptjs'); // For hashing and comparing passwords
const { check, validationResult } = require('express-validator'); // For validating incoming request data

// Import the User model and authentication middleware
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

// Create a new Express router
const router = express.Router();

// @route   POST auth/register
// @desc    Register user
// @access  Public
router.post(
  '/register',
  [
    // Validate email format
    check('email', 'Please include a valid email').isEmail(),

    // Validate password length
    check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 })
  ],
  async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // If there are validation errors, return 400 with error details
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      // Check if the user already exists
      let user = await User.findOne({ email });
      if (user) {
        return res.status(400).json({ msg: 'User already exists' });
      }

      // Create new user instance
      user = new User({ email, password });

      // Save user to the database (password should be hashed inside model's pre-save hook)
      await user.save();

      // Create a JWT payload with user ID
      const payload = { user: { id: user.id } };

      // Sign the JWT token with a secret key and set expiration
      jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: '5h' }, // Token expires in 5 hours
        (err, token) => {
          if (err) throw err;
          // Respond with success message and token
          res.json({ msg: 'User registered successfully', token });
        }
      );
    } catch (err) {
      // Handle server errors
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// @route   POST auth/login
// @desc    Login user and return JWT token
// @access  Public
router.post(
  '/login',
  [
    // Validate email
    check('email', 'Please include a valid email').isEmail(),

    // Check if password exists in the request
    check('password', 'Password is required').exists()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Return validation errors if any
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      // Find user by email
      let user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ msg: 'Invalid credentials' });
      }

      // Compare the entered password with the hashed one
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ msg: 'Invalid credentials' });
      }

      // Create payload and generate JWT token
      const payload = { user: { id: user.id } };
      jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: '5h' },
        (err, token) => {
          if (err) throw err;
          res.json({ token }); // Send token to client
        }
      );
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// @route   GET api/auth/user
// @desc    Get authenticated user data (excluding password)
// @access  Private
router.get('/user', authMiddleware, async (req, res) => {
  try {
    // Find user by ID set by auth middleware, exclude password from result
    const user = await User.findById(req.user.id).select('-password');
    res.json(user); // Send user data as response
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Export the router to use in the main app
module.exports = router;
