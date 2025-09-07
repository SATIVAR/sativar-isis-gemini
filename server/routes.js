

const express = require('express');
const { query, testMysqlConnection } = require('./db');
const router = express.Router();
const chalk = require('chalk');

// --- Helper Functions ---

// Helper to ensure 'tasks' field is a parsed array of objects.
// This handles cases where the DB driver might return a JSON string (e.g., some MySQL configs).
const parseReminderTasks = (reminder) => {
    if (!reminder) return null;

    if (reminder.tasks && typeof reminder.tasks === 'string') {
        try {
            reminder.tasks = JSON.parse(reminder.tasks);
        } catch (e) {
            console.error(`Failed to parse tasks JSON for reminder ID ${reminder.id}:`, reminder.tasks);
            reminder.tasks = []; // Default to empty array on parse error for safety
        }
    } else if (!reminder.tasks) {
        reminder.tasks = []; // Ensure tasks is always an array, even if null/undefined from DB
    }
    return reminder;
};


// --- Health Check ---
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// --- Settings Routes ---

// GET /api/settings
router.get('/settings', async (req, res, next) => {
  try {
    const rows = await query('SELECT data FROM settings WHERE id = 1');
    if (rows.length > 0) {
      // For MySQL, the 'data' field might be a string. For Postgres, it might be an object.
      // We parse it here to ensure the client always receives a consistent object.
      const settingsData = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data;
      res.json(settingsData);
    } else {
      res.json(null); // No settings found
    }
  } catch (err) {
    console.error(chalk.red(`[${req.method} ${req.originalUrl}] Error fetching settings:`), err.message);
    next(err);
  }
});

// POST /api/settings
router.post('/settings', async (req, res, next) => {
  const settingsData = req.body;
  // The 'data' column expects a JSON type. The mysql2 driver requires objects to be
  // stringified for JSON columns. We stringify it to ensure compatibility.
  const dataToStore = JSON.stringify(settingsData);
  try {
    const rows = await query('SELECT id FROM settings WHERE id = 1');
    
    if (rows && rows.length > 0) {
      // Update existing settings
      const updateQuery = 'UPDATE settings SET data = ?, updated_at = NOW() WHERE id = 1';
      await query(updateQuery, [dataToStore]);
    } else {
      // Insert new settings
      const insertQuery = 'INSERT INTO settings (id, data) VALUES (1, ?)';
      await query(insertQuery, [dataToStore]);
    }
    
    res.status(200).json({ success: true });
  } catch (err) {
    console.error(chalk.red(`[${req.method} ${req.originalUrl}] Error saving settings:`), err.message);
    next(err);
  }
});


// --- Reminders CRUD Routes ---

// GET /api/reminders - Get all reminders
router.get('/reminders', async (req, res, next) => {
  try {
    const rows = await query('SELECT * FROM reminders ORDER BY dueDate ASC');
    res.json(rows.map(parseReminderTasks));
  } catch (err) {
    console.error(chalk.red(`[${req.method} ${req.originalUrl}] Error fetching reminders:`), err.message);
    next(err);
  }
});

// POST /api/reminders - Create a new reminder
router.post('/reminders', async (req, res, next) => {
  const { id, quoteId, patientName, dueDate, notes, tasks, recurrence, priority } = req.body;
  // Ensure isCompleted has a value to prevent DB errors on NOT NULL constraint.
  const isCompleted = req.body.isCompleted ?? false;
  try {
    const insertQuery = `
      INSERT INTO reminders (id, quoteId, patientName, dueDate, notes, tasks, isCompleted, recurrence, priority)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    // Explicitly stringify the tasks array to ensure it's in the correct format for DB JSON types.
    const params = [id, quoteId, patientName, dueDate, notes, JSON.stringify(tasks || []), isCompleted, recurrence, priority || 'medium'];
    
    await query(insertQuery, params);
    const newReminders = await query('SELECT * FROM reminders WHERE id = ?', [id]);
    res.status(201).json(parseReminderTasks(newReminders[0]));

  } catch (err) {
    console.error(chalk.red(`[${req.method} ${req.originalUrl}] Error creating reminder:`), err.message);
    next(err);
  }
});

// PUT /api/reminders/:id - Update an existing reminder
router.put('/reminders/:id', async (req, res, next) => {
  const { id } = req.params;
  const { quoteId, patientName, dueDate, notes, tasks, recurrence, priority } = req.body;
  // Ensure isCompleted has a value to prevent DB errors on NOT NULL constraint.
  const isCompleted = req.body.isCompleted ?? false;
  try {
    const updateQuery = `
      UPDATE reminders
      SET quoteId = ?, patientName = ?, dueDate = ?, notes = ?, tasks = ?, isCompleted = ?, recurrence = ?, priority = ?, updated_at = NOW()
      WHERE id = ?
    `;
    // Explicitly stringify the tasks array to ensure it's in the correct format for DB JSON types.
    const params = [quoteId, patientName, dueDate, notes, JSON.stringify(tasks || []), isCompleted, recurrence, priority || 'medium', id];

    await query(updateQuery, params);
    const updatedReminders = await query('SELECT * FROM reminders WHERE id = ?', [id]);
    if (updatedReminders.length > 0) {
        res.json(parseReminderTasks(updatedReminders[0]));
    } else {
        res.status(404).json({ error: 'Reminder not found.' });
    }
  } catch (err) {
    console.error(chalk.red(`[${req.method} ${req.originalUrl}] Error updating reminder:`), err.message);
    next(err);
  }
});

// DELETE /api/reminders/:id - Delete a reminder
router.delete('/reminders/:id', async (req, res, next) => {
  const { id } = req.params;
  try {
    const deleteQuery = 'DELETE FROM reminders WHERE id = ?';
    await query(deleteQuery, [id]);
    res.status(204).send(); // No content
  } catch (err) {
    console.error(chalk.red(`[${req.method} ${req.originalUrl}] Error deleting reminder:`), err.message);
    next(err);
  }
});

// Endpoint for testing DB connection from frontend settings
router.post('/test-db-connection', async (req, res, next) => {
    const config = req.body;
    try {
        const result = await testMysqlConnection(config);
        if (result.success) {
            res.status(200).json({ success: true, message: 'Connection successful.' });
        } else {
            res.status(400).json({ success: false, message: 'Connection failed.', details: result.error });
        }
    } catch (err) {
        console.error(chalk.red(`[${req.method} ${req.originalUrl}] Error testing DB connection:`), err.message);
        next(err);
    }
});

module.exports = router;
