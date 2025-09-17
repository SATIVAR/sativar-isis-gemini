const express = require('express');
const { query } = require('./db');
const { chatQuery, getChatDb } = require('./chatDb');
const { userQuery } = require('./userDb');
const { seishatQuery, switchToMysql, getSeishatDb } = require('./seishatDb');
const { runSeishatMysqlMigration } = require('./migration');
const mysql = require('mysql2/promise');
const router = express.Router();
const chalk = require('chalk');

// --- Helper Functions ---

const parseReminderTasks = (reminder) => {
    if (!reminder) return null;

    if (reminder.tasks && typeof reminder.tasks === 'string') {
        try {
            reminder.tasks = JSON.parse(reminder.tasks);
        } catch (e) {
            console.error(`Failed to parse tasks JSON for reminder ID ${reminder.id}:`, reminder.tasks);
            reminder.tasks = [];
        }
    } else if (!reminder.tasks) {
        reminder.tasks = [];
    }
    return reminder;
};

const slugify = (text) => {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '_')           // Replace spaces with _
        .replace(/[^\w-]+/g, '')       // Remove all non-word chars
        .replace(/--+/g, '_')         // Replace multiple - with single _
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '');            // Trim - from end of text
};


// --- Settings Routes ---

router.get('/settings', async (req, res, next) => {
  try {
    const settingsRows = await query('SELECT data FROM settings WHERE id = 1');
    const productRows = await seishatQuery('SELECT id, name, price, description, icon FROM products');
    
    let settingsData = {};
    if (settingsRows.length > 0) {
      settingsData = typeof settingsRows[0].data === 'string' ? JSON.parse(settingsRows[0].data) : settingsRows[0].data;
    }
    
    settingsData.products = productRows || [];

    res.json(settingsData);
  } catch (err) {
    console.error(chalk.red(`[${req.method} ${req.originalUrl}] Error fetching settings:`), err.message);
    next(err);
  }
});

router.post('/settings', async (req, res, next) => {
  const { products, ...settingsData } = req.body;
  delete settingsData.seishat_database_mode;
  const settingsDataToStore = JSON.stringify(settingsData);
  
  const seishatDbConnection = getSeishatDb();

  try {
    if (seishatDbConnection.constructor.name === 'Database') { // better-sqlite3
        const saveProducts = seishatDbConnection.transaction((productList) => {
            seishatDbConnection.prepare('DELETE FROM products').run();
            if (productList && productList.length > 0) {
                const insert = seishatDbConnection.prepare('INSERT INTO products (id, name, price, description, icon) VALUES (@id, @name, @price, @description, @icon)');
                for (const product of productList) {
                    const id = product.id ?? crypto.randomUUID();
                    insert.run({ ...product, id });
                }
            }
        });
        saveProducts(products);
    } else { // mysql2
        const conn = await seishatDbConnection.getConnection();
        await conn.beginTransaction();
        await conn.query('DELETE FROM products');
        if (products && products.length > 0) {
            const insertQuery = 'INSERT INTO products (id, name, price, description, icon) VALUES ?';
            const values = products.map(p => [p.id ?? crypto.randomUUID(), p.name, p.price, p.description, p.icon]);
            if (values.length > 0) await conn.query(insertQuery, [values]);
        }
        await conn.commit();
        conn.release();
    }

    const settingsRows = await query('SELECT id FROM settings WHERE id = 1');
    if (settingsRows && settingsRows.length > 0) {
      await query('UPDATE settings SET data = ? WHERE id = 1', [settingsDataToStore]);
    } else {
      await query('INSERT INTO settings (id, data) VALUES (1, ?)', [settingsDataToStore]);
    }
    
    res.status(200).json({ success: true });
  } catch (err) {
    console.error(chalk.red(`[${req.method} ${req.originalUrl}] Error saving settings:`), err.message);
    next(err);
  }
});

router.get('/settings/seishat/db-mode', async (req, res, next) => {
    try {
        const settingsRows = await query('SELECT data FROM settings WHERE id = 1');
        let settings = {};
        if (settingsRows.length > 0 && settingsRows[0].data) {
            settings = JSON.parse(settingsRows[0].data);
        }
        res.json({ mode: settings.seishat_database_mode || 'sqlite' });
    } catch (err) {
        console.error(chalk.red(`[GET /settings/seishat/db-mode] Error fetching db mode:`), err.message);
        next(err);
    }
});

router.post('/settings/seishat/test-mysql', async (req, res, next) => {
    let connection;
    try {
        if (!process.env.DB_HOST) {
            throw new Error("Variáveis de ambiente do MySQL não configuradas no servidor.");
        }
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_DATABASE || process.env.DB_NAME,
        });
        await connection.ping();
        res.json({ success: true, message: 'Conexão com MySQL bem-sucedida!' });
    } catch (err) {
        console.error(chalk.red(`[POST /settings/seishat/test-mysql] Error testing MySQL connection:`), err.message);
        res.status(500).json({ success: false, message: `Falha na conexão com o MySQL: ${err.message}` });
    } finally {
        if (connection) await connection.end();
    }
});

router.post('/settings/seishat/activate-mysql', async (req, res, next) => {
    let pool;
    try {
        if (!process.env.DB_HOST) throw new Error("Variáveis de ambiente do MySQL não configuradas no servidor.");
        
        pool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_DATABASE || process.env.DB_NAME,
            connectionLimit: 1
        });
        await pool.query('SELECT 1');

        await runSeishatMysqlMigration(pool);
        await pool.end();

        const settingsRows = await query('SELECT data FROM settings WHERE id = 1');
        let settings = {};
        if (settingsRows.length > 0 && settingsRows[0].data) {
            settings = JSON.parse(settingsRows[0].data);
        }
        settings.seishat_database_mode = 'mysql';
        await query('UPDATE settings SET data = ? WHERE id = 1', [JSON.stringify(settings)]);

        await switchToMysql();

        res.json({ success: true, message: 'Banco de dados MySQL ativado e configurado com sucesso!' });

    } catch (err) {
        if (pool) await pool.end();
        console.error(chalk.red(`[POST /settings/seishat/activate-mysql] Error activating MySQL:`), err.message);
        res.status(500).json({ success: false, message: `Falha ao ativar o MySQL: ${err.message}` });
    }
});


// --- Reminders CRUD Routes ---

router.get('/reminders', async (req, res, next) => {
  try {
    const rows = await query('SELECT * FROM reminders ORDER BY dueDate ASC');
    res.json(rows.map(parseReminderTasks));
  } catch (err) {
    console.error(chalk.red(`[${req.method} ${req.originalUrl}] Error fetching reminders:`), err.message);
    next(err);
  }
});

router.post('/reminders', async (req, res, next) => {
  const { id, quoteId, patientName, dueDate, notes, tasks, recurrence, priority } = req.body;
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

router.delete('/reminders/:id', async (req, res, next) => {
  const { id } = req.params;
  try {
    const deleteQuery = 'DELETE FROM reminders WHERE id = ?';
    await query(deleteQuery, [id]);
    res.status(204).send();
  } catch (err) {
    console.error(chalk.red(`[${req.method} ${req.originalUrl}] Error deleting reminder:`), err.message);
    next(err);
  }
});

// --- Chat History Routes ---

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

router.get('/chats/:id', async (req, res, next) => {
    const { id } = req.params;
    try {
        const rows = await chatQuery('SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC', [id]);
        
        const messages = rows.map(msg => {
            try {
                return {
                    ...msg,
                    content: JSON.parse(msg.content),
                };
            } catch (e) {
                console.error(`Failed to parse message content for msg ID ${msg.id}`);
                return {
                    ...msg,
                    content: { type: 'error', message: 'Failed to load message content.' },
                }
            }
        });
        res.json(messages);
    } catch (err) {
        console.error(chalk.red(`[${req.method} ${req.originalUrl}] Error fetching messages for conversation ${id}:`), err.message);
        next(err);
    }
});

router.post('/chats', async (req, res, next) => {
    try {
        const { id, title } = req.body;
        const chatDb = getChatDb();

        const createNewConvo = chatDb.transaction(() => {
            const lastActiveConvo = chatDb.prepare(`
                SELECT id FROM conversations 
                WHERE is_closed = 0 
                ORDER BY updated_at DESC 
                LIMIT 1
            `).get();

            if (lastActiveConvo) {
                chatDb.prepare('UPDATE conversations SET is_closed = 1 WHERE id = ?').run(lastActiveConvo.id);
            }

            const CONVERSATION_LIMIT = 5;
            const conversations = chatDb.prepare('SELECT id FROM conversations ORDER BY created_at ASC').all();
            if (conversations.length >= CONVERSATION_LIMIT) {
                const oldestConvoId = conversations[0].id;
                chatDb.prepare('DELETE FROM conversations WHERE id = ?').run(oldestConvoId);
                console.log(chalk.yellow(`[FIFO] Removed least recent conversation: ${oldestConvoId}`));
            }
            
            chatDb.prepare('INSERT INTO conversations (id, title, is_closed) VALUES (?, ?, 0)').run(id, title);
        });

        createNewConvo();

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

router.post('/chats/:id/messages', async (req, res, next) => {
    const { id: conversation_id } = req.params;
    const { id, sender, content, isActionComplete, tokenCount, duration } = req.body;
    
    const timestamp = new Date().toISOString();

    try {
        const insertQuery = `
            INSERT INTO messages (id, conversation_id, sender, content, timestamp, is_action_complete, token_count, duration)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const params = [
            id,
            conversation_id,
            sender,
            JSON.stringify(content),
            timestamp,
            isActionComplete ? 1 : 0,
            tokenCount,
            duration
        ];
        
        await chatQuery(insertQuery, params);
        
        const [newMessage] = await chatQuery('SELECT * from messages WHERE id = ?', [id]);

        res.status(201).json(newMessage);

    } catch (err) {
        console.error(chalk.red(`[${req.method} ${req.originalUrl}] Error adding message:`), err.message);
        next(err);
    }
});

router.put('/chats/:id/title', async (req, res, next) => {
    const { id } = req.params;
    const { title } = req.body;

    if (!title) {
        return res.status(400).json({ error: 'Title is required.' });
    }

    try {
        await chatQuery('UPDATE conversations SET title = ?, updated_at = datetime(\'now\', \'localtime\') WHERE id = ?', [title, id]);
        res.status(200).json({ success: true });
    } catch (err) {
        console.error(chalk.red(`[${req.method} ${req.originalUrl}] Error updating conversation title:`), err.message);
        next(err);
    }
});

router.delete('/chats/:id', async (req, res, next) => {
  const { id } = req.params;
  try {
    const result = await chatQuery('DELETE FROM conversations WHERE id = ?', [id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Conversation not found.' });
    }
    console.log(chalk.yellow(`[DELETE] Removed conversation: ${id}`));
    res.status(204).send();
  } catch (err) {
    console.error(chalk.red(`[${req.method} ${req.originalUrl}] Error deleting conversation:`), err.message);
    next(err);
  }
});

// --- Auth & User Management Routes ---

router.get('/auth/setup-status', async (req, res, next) => {
  try {
    const rows = await userQuery("SELECT 1 FROM users WHERE role = 'admin' LIMIT 1");
    res.json({ isAdminSetup: rows.length > 0 });
  } catch (err) {
    console.error(chalk.red(`[${req.method} ${req.originalUrl}] Error checking admin setup:`), err.message);
    next(err);
  }
});

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

router.get('/users', async (req, res, next) => {
  try {
    const users = await userQuery('SELECT id, name, whatsapp, role FROM users ORDER BY name ASC');
    res.json(users);
  } catch (err) {
    console.error(chalk.red(`[${req.method} ${req.originalUrl}] Error fetching users:`), err.message);
    next(err);
  }
});

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

// --- Seishat Associates CRUD Routes ---

router.get('/seishat/associates', async (req, res, next) => {
    const { search } = req.query;
    try {
        let associates;
        if (search) {
            const searchTerm = `%${search}%`;
            associates = await seishatQuery('SELECT id, full_name, cpf, whatsapp, type FROM associates WHERE full_name LIKE ? OR cpf LIKE ? ORDER BY full_name ASC', [searchTerm, searchTerm]);
        } else {
            associates = await seishatQuery('SELECT id, full_name, cpf, whatsapp, type FROM associates ORDER BY full_name ASC');
        }
        res.json(associates);
    } catch (err) {
        console.error(chalk.red(`[${req.method} ${req.originalUrl}] Error fetching associates:`), err.message);
        next(err);
    }
});

router.post('/seishat/associates', async (req, res, next) => {
    try {
        const { full_name, cpf, whatsapp, password, type } = req.body;
        if (!full_name || !password || !type) {
            return res.status(400).json({ error: 'Full name, password, and type are required.' });
        }
        const newAssociateId = crypto.randomUUID();
        await seishatQuery('INSERT INTO associates (id, full_name, cpf, whatsapp, password, type) VALUES (?, ?, ?, ?, ?, ?)', [newAssociateId, full_name, cpf, whatsapp, password, type]);
        res.status(201).json({ id: newAssociateId, full_name, cpf, whatsapp, type });
    } catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE' || (err.code && err.code.includes('ER_DUP_ENTRY'))) {
            return res.status(409).json({ error: 'An associate with this CPF already exists.' });
        }
        console.error(chalk.red(`[${req.method} ${req.originalUrl}] Error creating associate:`), err.message);
        next(err);
    }
});

router.put('/seishat/associates/:id', async (req, res, next) => {
    const { id } = req.params;
    const { full_name, cpf, whatsapp, password, type } = req.body;
    if (!full_name || !type) {
        return res.status(400).json({ error: 'Full name and type are required.' });
    }
    try {
        if (password) {
            await seishatQuery('UPDATE associates SET full_name = ?, cpf = ?, whatsapp = ?, password = ?, type = ? WHERE id = ?', [full_name, cpf, whatsapp, password, type, id]);
        } else {
            await seishatQuery('UPDATE associates SET full_name = ?, cpf = ?, whatsapp = ?, type = ? WHERE id = ?', [full_name, cpf, whatsapp, type, id]);
        }
        res.status(200).json({ id, full_name, cpf, whatsapp, type });
    } catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE' || (err.code && err.code.includes('ER_DUP_ENTRY'))) {
            return res.status(409).json({ error: 'An associate with this CPF already exists.' });
        }
        console.error(chalk.red(`[${req.method} ${req.originalUrl}] Error updating associate:`), err.message);
        next(err);
    }
});

router.delete('/seishat/associates/:id', async (req, res, next) => {
    const { id } = req.params;
    try {
        await seishatQuery('DELETE FROM associates WHERE id = ?', [id]);
        res.status(204).send();
    } catch (err) {
        console.error(chalk.red(`[${req.method} ${req.originalUrl}] Error deleting associate:`), err.message);
        next(err);
    }
});

// --- Admin / Form Builder Routes ---

// GET /api/admin/fields - Get all possible form fields from the catalog
router.get('/admin/fields', async (req, res, next) => {
    try {
        const fields = await seishatQuery('SELECT * FROM form_fields ORDER BY is_core_field DESC, label ASC');
        res.json(fields);
    } catch (err) {
        console.error(chalk.red(`[${req.method} ${req.originalUrl}] Error fetching form fields:`), err.message);
        next(err);
    }
});

// POST /api/admin/fields - Create a new custom field in the catalog
router.post('/admin/fields', async (req, res, next) => {
    const { label, field_type, options } = req.body;
    if (!label || !field_type) {
        return res.status(400).json({ error: 'Label and field type are required.' });
    }
    
    const field_name = slugify(label) + `_${Date.now()}`;

    try {
        const db = getSeishatDb();
        if (db.constructor.name === 'Database') { // better-sqlite3
            const result = await seishatQuery(
                'INSERT INTO form_fields (field_name, label, field_type, options, is_core_field, is_deletable) VALUES (?, ?, ?, ?, 0, 1)',
                [field_name, label, field_type, options ? JSON.stringify(options) : null]
            );
            const [newField] = await seishatQuery('SELECT * FROM form_fields WHERE id = ?', [result.lastInsertRowid]);
            res.status(201).json(newField);
        } else { // mysql2
            const result = await seishatQuery(
                'INSERT INTO form_fields (field_name, label, field_type, options, is_core_field, is_deletable) VALUES (?, ?, ?, ?, 0, 1)',
                [field_name, label, field_type, options ? JSON.stringify(options) : null]
            );
            const [newField] = await seishatQuery('SELECT * FROM form_fields WHERE id = ?', [result.insertId]);
            res.status(201).json(newField);
        }
    } catch (err) {
        console.error(chalk.red(`[${req.method} ${req.originalUrl}] Error creating custom field:`), err.message);
        next(err);
    }
});

// GET /api/admin/layouts/:type - Get the form layout for an associate type
router.get('/admin/layouts/:type', async (req, res, next) => {
    const { type } = req.params;
    try {
        const sql = `
            SELECT
                ff.id, ff.field_name, ff.label, ff.field_type, ff.options, ff.is_core_field, ff.is_deletable,
                fl.display_order,
                fl.is_required
            FROM form_fields ff
            LEFT JOIN form_layouts fl ON ff.id = fl.field_id AND fl.associate_type = ?
            WHERE fl.associate_type = ? OR ff.is_core_field = 1
            ORDER BY fl.display_order ASC, ff.id ASC
        `;

        // This query is more complex now to handle core fields that might not be in the layout table yet.
        const allFieldsForType = await seishatQuery(sql, [type, type]);
        
        // Post-processing to ensure all core fields are present and handle null orders/requirements
        const coreFields = allFieldsForType.filter(f => f.is_core_field);
        let layoutFields = allFieldsForType.filter(f => f.display_order !== null);
        
        coreFields.forEach(coreField => {
            if (!layoutFields.some(lf => lf.id === coreField.id)) {
                 layoutFields.push({
                    ...coreField,
                    display_order: -1, // Will be sorted to the top
                    is_required: 1, // Core fields are always required
                });
            }
        });

        layoutFields.sort((a,b) => a.display_order - b.display_order);

        res.json(layoutFields);
    } catch (err) {
        console.error(chalk.red(`[${req.method} ${req.originalUrl}] Error fetching form layout for type ${type}:`), err.message);
        next(err);
    }
});


// PUT /api/admin/layouts/:type - Save the entire layout for an associate type
router.put('/admin/layouts/:type', async (req, res, next) => {
    const { type } = req.params;
    const layout = req.body;

    if (!Array.isArray(layout)) {
        return res.status(400).json({ error: 'Request body must be an array of layout fields.' });
    }
    
    const db = getSeishatDb();
    
    try {
        if (db.constructor.name === 'Database') { // better-sqlite3
            const runTransaction = db.transaction(() => {
                db.prepare('DELETE FROM form_layouts WHERE associate_type = ?').run(type);
                if (layout.length > 0) {
                    const insert = db.prepare('INSERT INTO form_layouts (associate_type, field_id, display_order, is_required) VALUES (?, ?, ?, ?)');
                    for (const field of layout) {
                        insert.run(type, field.field_id, field.display_order, field.is_required ? 1 : 0);
                    }
                }
            });
            runTransaction();
        } else { // mysql2
            const conn = await db.getConnection();
            await conn.beginTransaction();
            await conn.query('DELETE FROM form_layouts WHERE associate_type = ?', [type]);
            if (layout.length > 0) {
                const values = layout.map(field => [type, field.field_id, field.display_order, field.is_required ? 1 : 0]);
                await conn.query('INSERT INTO form_layouts (associate_type, field_id, display_order, is_required) VALUES ?', [values]);
            }
            await conn.commit();
            conn.release();
        }
        res.status(200).json({ success: true, message: `Layout for ${type} saved.` });
    } catch (err) {
        console.error(chalk.red(`[${req.method} ${req.originalUrl}] Error saving form layout for type ${type}:`), err.message);
        next(err);
    }
});


module.exports = router;
