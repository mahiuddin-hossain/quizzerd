/**
 * backend/db.js
 * Quizzerd — Database Connection Module
 * Creates a MySQL connection pool using mysql2 with promise support.
 * Connection pool reuses connections for better performance.
 */

const mysql = require('mysql2');
require('dotenv').config();

// Create a connection pool for efficient database access
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,   // wait if all connections are busy
    connectionLimit: 10,        // max simultaneous connections
    queueLimit: 0               // unlimited queue (0 = no limit)
});

// Export promise-based pool for async/await usage
const promisePool = pool.promise();

module.exports = promisePool;

promisePool.getConnection = () => pool.promise().getConnection();
module.exports = promisePool;