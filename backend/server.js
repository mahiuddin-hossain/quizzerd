/**
 * Quizzerd — Express Server Entry Point
 * Sets up middleware, routes, and serves the frontend.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import route modules
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// ---- Middleware ----

// Enable CORS for cross-origin requests
app.use(cors());

// Parse incoming JSON request bodies
app.use(express.json());

// Parse URL-encoded form data
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, '../frontend')));

// ---- API Routes ----

app.use('/api/auth', authRoutes);

// ---- Default Route: Serve login page ----

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

// ---- Start Server ----

app.listen(PORT, () => {
    console.log(`⚡ Quizzerd server running at http://localhost:${PORT}`);
    console.log(`📁 Serving frontend from: ${path.join(__dirname, '../frontend')}`);
});