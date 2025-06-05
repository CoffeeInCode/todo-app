require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test DB Connection and Create Table if not exists
async function initializeDatabase() {
    try {
        const connection = await pool.getConnection();
        console.log('Successfully connected to the database.');

        await connection.query(`
            CREATE TABLE IF NOT EXISTS tasks (
                id INT AUTO_INCREMENT PRIMARY KEY,
                task_name VARCHAR(255) NOT NULL,
                is_completed BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Table "tasks" checked/created successfully.');
        connection.release();
    } catch (err) {
        console.error('Error connecting to DB or creating table:', err.stack);
        // Exit if DB connection fails, PM2 will restart
        process.exit(1);
    }
}

// API Endpoints
// Get all tasks
app.get('/api/tasks', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM tasks ORDER BY created_at DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add a new task
app.post('/api/tasks', async (req, res) => {
    try {
        const { task_name } = req.body;
        if (!task_name) {
            return res.status(400).json({ error: 'Task name is required' });
        }
        const [result] = await pool.query('INSERT INTO tasks (task_name) VALUES (?)', [task_name]);
        res.status(201).json({ id: result.insertId, task_name, is_completed: false });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update a task (mark as completed/incomplete)
app.put('/api/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { is_completed } = req.body;
        await pool.query('UPDATE tasks SET is_completed = ? WHERE id = ?', [is_completed, id]);
        res.json({ message: 'Task updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete a task
app.delete('/api/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM tasks WHERE id = ?', [id]);
        res.json({ message: 'Task deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Serve the frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize DB and start server
initializeDatabase().then(() => {
    app.listen(port, '0.0.0.0', () => { // Listen on all available network interfaces
        console.log(`Server running on http://0.0.0.0:${port}`);
    });
}).catch(err => {
    console.error("Failed to initialize database and start server:", err);
});