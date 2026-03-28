/**
 * backend/server.js
 * Quizzerd — Express Server Entry Point
 * সব routes register করা আছে।
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Route modules import করো
const authRoutes      = require('./routes/auth');
const usersRoutes     = require('./routes/users');
const quizzesRoutes   = require('./routes/quizzes');
const attemptsRoutes  = require('./routes/attempts');
const leaderboardRoutes = require('./routes/leaderboard');
const exploreRoutes = require('./routes/explore');
const bookmarkRoutes = require('./routes/bookmarks');

const app = express();
const PORT = process.env.PORT || 3000;

// ---- Middleware ----
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static frontend files serve করো
app.use(express.static(path.join(__dirname, '../frontend')));

// ---- API Routes ----
app.use('/api/auth',        authRoutes);
app.use('/api/users',       usersRoutes);
app.use('/api/quizzes',     quizzesRoutes);
app.use('/api/attempts',    attemptsRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/explore', exploreRoutes); 
app.use('/api/bookmarks', bookmarkRoutes);

// ---- Default Route ----
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

// ---- 404 Handler ----
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found.' });
});

// ---- Start Server ----
app.listen(PORT, () => {
    console.log(`⚡ Quizzerd server running at http://localhost:${PORT}`);
    console.log(`📁 Frontend: ${path.join(__dirname, '../frontend')}`);
});