/**
 * backend/routes/auth.js
 * Quizzerd — Authentication Routes
 * Handles user registration and login.
 * Uses bcrypt for password hashing and JWT for session tokens.
 * All SQL queries use prepared statements to prevent SQL injection.
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();

/**
 * POST /api/auth/register
 * Register a new user account
 * Body: { first_name, last_name, username, email, password }
 */
router.post('/register', async (req, res) => {
    try {
        const { first_name, last_name, username, email, password } = req.body;

        // Validate that all required fields are present
        if (!first_name || !last_name || !username || !email || !password) {
            return res.status(400).json({ error: 'All fields are required.' });
        }

        // Check if username or email already exists (prevent duplicates)
        const [existing] = await db.execute(
            'SELECT id FROM users WHERE username = ? OR email = ?',
            [username, email]
        );

        if (existing.length > 0) {
            return res.status(409).json({ error: 'Username or email already exists.' });
        }

        // Hash the password with bcrypt (salt rounds = 10)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insert new user into database using prepared statement
        const [result] = await db.execute(
            'INSERT INTO users (first_name, last_name, username, email, password) VALUES (?, ?, ?, ?, ?)',
            [first_name, last_name, username, email, hashedPassword]
        );

        // Return success response
        res.status(201).json({
            message: 'Registration successful!',
            userId: result.insertId
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Server error during registration.' });
    }
});

/**
 * POST /api/auth/login
 * Authenticate user and return JWT token
 * Body: { username, password }
 */
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validate required fields
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required.' });
        }

        // Find user by username using prepared statement
        const [users] = await db.execute(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );

        // Check if user exists
        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid username or password.' });
        }

        const user = users[0];

        // Compare entered password with stored hashed password
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid username or password.' });
        }

        // Generate JWT token (expires in 24 hours)
        const token = jwt.sign(
            { id: user.id, username: user.username, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Return token and user data (excluding password)
        res.status(200).json({
            message: 'Login successful!',
            token,
            user: {
                id: user.id,
                first_name: user.first_name,
                last_name: user.last_name,
                username: user.username,
                email: user.email
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error during login.' });
    }
});

module.exports = router;