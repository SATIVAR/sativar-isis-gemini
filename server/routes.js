

const express = require('express');
const { query } = require('./db');
const { chatQuery, getChatDb } = require('./chatDb');
const { userQuery } = require('./userDb');
const router = express.Router();
const chalk = require('chalk');

// --- Helper Functions ---

// Helper to ensure 'tasks' field is a parsed array of objects.
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


// --- Settings Routes ---

// GET /api/settings
router.get('/settings', async (req, res, next) => {
  try {
    const rows = await query('SELECT data FROM settings WHERE id = 1');
    if (rows.length > 0) {
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
  const dataToStore = JSON.stringify(settingsData);
  try {
    const rows = await query('SELECT id FROM settings WHERE id = 1');
    
    if (rows && rows.length > 0) {
      // Update existing settings. The 'updated_at' field is handled by a DB trigger.
      const updateQuery = 'UPDATE settings SET data = ? WHERE id = 1';
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
  const isCompleted = req.body.isCompleted ? 1 : 0;
  try {
    const insertQuery = `
      INSERT INTO reminders (id, quoteId, patientName, dueDate, notes, tasks, isCompleted, recurrence, priority)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
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
  const isCompleted = req.body.isCompleted ? 1 : 0;
  try {
    const updateQuery = `
      UPDATE reminders
      SET quoteId = ?, patientName = ?, dueDate = ?, notes = ?, tasks = ?, isCompleted = ?, recurrence = ?, priority = ?
      WHERE id = ?
    `;
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

// --- Chat History Routes ---

// GET /api/chats - Get recent conversations
router.get('/chats', async (req, res, next) => {
  try {
    const conversationsRaw = await chatQuery('SELECT * FROM conversations ORDER BY updated_at DESC');
    const conversations = conversationsRaw.map(c => ({
        ...c,
        is_closed: c.is_closed === 1
    }));
    res.json(conversations);
  } catch (err) {
    console.error(chalk.red(`[${req.method} ${req.originalUrl}] Error fetching conversations:`), err.message);
    next(err);
  }
});

// GET /api/chats/:id - Get messages for a conversation
router.get('/chats/:id', async (req, res, next) => {
    const { id } = req.params;
    try {
        const rows = await chatQuery('SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC', [id]);
        
        const messages = rows.map(msg => {
            try {
                return {
                    ...msg,
                    content: JSON.parse(msg.content),
                    is_action_complete: msg.is_action_complete === 1,
                };
            } catch (e) {
                console.error(`Failed to parse message content for msg ID ${msg.id}`);
                return {
                    ...msg,
                    content: { type: 'error', message: 'Failed to load message content.' },
                    is_action_complete: msg.is_action_complete === 1,
                }
            }
        });
        res.json(messages);
    } catch (err) {
        console.error(chalk.red(`[${req.method} ${req.originalUrl}] Error fetching messages for conversation ${id}:`), err.message);
        next(err);
    }
});

// POST /api/chats - Create a new conversation with FIFO and closing logic
router.post('/chats', async (req, res, next) => {
    try {
        const { id, title } = req.body;
        const chatDb = getChatDb();

        // Using a transaction to ensure all operations succeed or fail together
        const createNewConvo = chatDb.transaction(() => {
            // 1. Find and close the most recent active conversation (if one exists)
            const lastActiveConvo = chatDb.prepare(`
                SELECT id FROM conversations 
                WHERE is_closed = 0 
                ORDER BY updated_at DESC 
                LIMIT 1
            `).get();

            if (lastActiveConvo) {
                chatDb.prepare('UPDATE conversations SET is_closed = 1 WHERE id = ?').run(lastActiveConvo.id);
            }

            // 2. Enforce the conversation limit with FIFO
            const CONVERSATION_LIMIT = 5;
            const conversations = chatDb.prepare('SELECT id FROM conversations ORDER BY created_at ASC').all();
            if (conversations.length >= CONVERSATION_LIMIT) {
                const oldestConvoId = conversations[0].id;
                chatDb.prepare('DELETE FROM conversations WHERE id = ?').run(oldestConvoId);
                console.log(chalk.yellow(`[FIFO] Removed least recent conversation: ${oldestConvoId}`));
            }
            
            // 3. Insert the new conversation as active
            chatDb.prepare('INSERT INTO conversations (id, title, is_closed) VALUES (?, ?, 0)').run(id, title);
        });

        createNewConvo();

        // Fetch the newly created conversation to return it
        const newConversationResult = await chatQuery('SELECT * FROM conversations WHERE id = ?', [id]);
        if (newConversationResult.length === 0) {
            throw new Error("Failed to create and retrieve new conversation.");
        }
        const newConversation = {
            ...newConversationResult[0],
            is_closed: newConversationResult[0].is_closed === 1,
        };
        res.status(201).json(newConversation);

    } catch (err) {
        console.error(chalk.red(`[${req.method} ${req.originalUrl}] Error creating conversation:`), err.message);
        next(err);
    }
});

// POST /api/chats/:id/messages - Add a message to a conversation
router.post('/chats/:id/messages', async (req, res, next) => {
    const { id: conversation_id } = req.params;
    const { id, sender, content, isActionComplete } = req.body;
    
    // The timestamp is crucial for ordering, let the server generate it for consistency
    const timestamp = new Date().toISOString();

    try {
        const insertQuery = `
            INSERT INTO messages (id, conversation_id, sender, content, timestamp, is_action_complete)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const params = [
            id,
            conversation_id,
            sender,
            JSON.stringify(content),
            timestamp,
            isActionComplete ? 1 : 0
        ];
        
        await chatQuery(insertQuery, params);
        
        const [newMessage] = await chatQuery('SELECT * from messages WHERE id = ?', [id]);

        res.status(201).json(newMessage);

    } catch (err) {
        console.error(chalk.red(`[${req.method} ${req.originalUrl}] Error adding message:`), err.message);
        next(err);
    }
});

// PUT /api/chats/:id/title - Update conversation title
router.put('/chats/:id/title', async (req, res, next) => {
    const { id } = req.params;
    const { title } = req.body;

    if (!title) {
        return res.status(400).json({ error: 'Title is required.' });
    }

    try {
        // Also update the `updated_at` timestamp to ensure the conversation moves to the top of the list,
        // matching the optimistic update behavior on the frontend.
        await chatQuery('UPDATE conversations SET title = ?, updated_at = datetime(\'now\', \'localtime\') WHERE id = ?', [title, id]);
        res.status(200).json({ success: true });
    } catch (err) {
        console.error(chalk.red(`[${req.method} ${req.originalUrl}] Error updating conversation title:`), err.message);
        next(err);
    }
});

// DELETE /api/chats/:id - Delete a conversation
router.delete('/chats/:id', async (req, res, next) => {
  const { id } = req.params;
  try {
    const result = await chatQuery('DELETE FROM conversations WHERE id = ?', [id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Conversation not found.' });
    }
    console.log(chalk.yellow(`[DELETE] Removed conversation: ${id}`));
    res.status(204).send(); // No Content
  } catch (err) {
    console.error(chalk.red(`[${req.method} ${req.originalUrl}] Error deleting conversation:`), err.message);
    next(err);
  }
});

// --- Auth & User Management Routes ---

// GET /api/auth/setup-status - Check if an admin account exists
router.get('/auth/setup-status', async (req, res, next) => {
  try {
    const rows = await userQuery("SELECT 1 FROM users WHERE role = 'admin' LIMIT 1");
    res.json({ isAdminSetup: rows.length > 0 });
  } catch (err) {
    console.error(chalk.red(`[${req.method} ${req.originalUrl}] Error checking admin setup:`), err.message);
    next(err);
  }
});

// POST /api/auth/register-admin - Create the first admin user
router.post('/auth/register-admin', async (req, res, next) => {
  try {
    const existingAdmin = await userQuery("SELECT 1 FROM users WHERE role = 'admin' LIMIT 1");
    if (existingAdmin.length > 0) {
      return res.status(409).json({ error: 'An admin user already exists.' });
    }
    const { name, whatsapp, password } = req.body;
    if (!name || !password) {
        return res.status(400).json({ error: 'Name and password are required.' });
    }
    const newUserId = crypto.randomUUID();
    await userQuery('INSERT INTO users (id, name, whatsapp, role, password) VALUES (?, ?, ?, ?, ?)', [newUserId, name, whatsapp, 'admin', password]);
    res.status(201).json({ id: newUserId, name, role: 'admin' });
  } catch (err) {
    console.error(chalk.red(`[${req.method} ${req.originalUrl}] Error registering admin:`), err.message);
    next(err);
  }
});

// POST /api/auth/login - Log a user in
router.post('/auth/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const users = await userQuery('SELECT id, name, whatsapp, role, password FROM users WHERE name = ?', [username]);
    if (users.length === 0 || users[0].password !== password) {
      return res.status(401).json({ error: 'Credenciais inválidas. Por favor, tente novamente.' });
    }
    const { password: _, ...userToReturn } = users[0];
    res.json(userToReturn);
  } catch (err) {
    console.error(chalk.red(`[${req.method} ${req.originalUrl}] Error during login:`), err.message);
    next(err);
  }
});

// GET /api/users - Get all users
router.get('/users', async (req, res, next) => {
  try {
    const users = await userQuery('SELECT id, name, whatsapp, role FROM users ORDER BY name ASC');
    res.json(users);
  } catch (err) {
    console.error(chalk.red(`[${req.method} ${req.originalUrl}] Error fetching users:`), err.message);
    next(err);
  }
});

// POST /api/users - Create a new user
router.post('/users', async (req, res, next) => {
  try {
    const { name, whatsapp, role, password } = req.body;
    if (!name || !role || !password) {
      return res.status(400).json({ error: 'Name, role, and password are required.' });
    }
    if (role === 'admin') {
        const existingAdmin = await userQuery("SELECT 1 FROM users WHERE role = 'admin' LIMIT 1");
        if (existingAdmin.length > 0) {
            return res.status(409).json({ error: 'An admin user already exists. Cannot create another.' });
        }
    }
    const newUserId = crypto.randomUUID();
    await userQuery('INSERT INTO users (id, name, whatsapp, role, password) VALUES (?, ?, ?, ?, ?)', [newUserId, name, whatsapp, role, password]);
    res.status(201).json({ id: newUserId, name, whatsapp, role });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return res.status(409).json({ error: 'A user with this name already exists.'});
    }
    console.error(chalk.red(`[${req.method} ${req.originalUrl}] Error creating user:`), err.message);
    next(err);
  }
});

// PUT /api/users/:id - Update a user
router.put('/users/:id', async (req, res, next) => {
  const { id } = req.params;
  const { name, whatsapp, role, password } = req.body;
  if (!name || !role) {
    return res.status(400).json({ error: 'Name and role are required.' });
  }
  try {
    if (password) {
      await userQuery('UPDATE users SET name = ?, whatsapp = ?, role = ?, password = ? WHERE id = ?', [name, whatsapp, role, password, id]);
    } else {
      await userQuery('UPDATE users SET name = ?, whatsapp = ?, role = ? WHERE id = ?', [name, whatsapp, role, id]);
    }
    res.status(200).json({ id, name, whatsapp, role });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return res.status(409).json({ error: 'A user with this name already exists.'});
    }
    console.error(chalk.red(`[${req.method} ${req.originalUrl}] Error updating user:`), err.message);
    next(err);
  }
});

// DELETE /api/users/:id - Delete a user
router.delete('/users/:id', async (req, res, next) => {
    const { id } = req.params;
    try {
        const userToDelete = await userQuery('SELECT role FROM users WHERE id = ?', [id]);
        if (userToDelete.length > 0 && userToDelete[0].role === 'admin') {
            return res.status(403).json({ error: 'The admin user cannot be deleted.' });
        }
        await userQuery('DELETE FROM users WHERE id = ?', [id]);
        res.status(204).send();
    } catch (err) {
        console.error(chalk.red(`[${req.method} ${req.originalUrl}] Error deleting user:`), err.message);
        next(err);
    }
});

module.exports = router;