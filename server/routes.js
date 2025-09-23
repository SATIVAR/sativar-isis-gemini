const express = require('express');
const { query } = require('./db');
const { chatQuery, getChatDb } = require('./chatDb');
const { userQuery } = require('./userDb');
const { seishatQuery, getSeishatDb, getDbMode } = require('./seishatDb');
const router = express.Router();
const chalk = require('chalk');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { randomUUID } = require('crypto');

// --- Helper Functions ---

/**
 * Compresses a PDF file using Ghostscript. Falls back to copying the original file if Ghostscript fails.
 * @param {string} inputPath The path to the original PDF file.
 * @param {string} outputPath The path to save the compressed PDF file.
 * @returns {Promise<void>} A promise that resolves when compression is complete, or rejects on error.
 */
const compressPdf = (inputPath, outputPath) => {
  return new Promise((resolve, reject) => {
    // /ebook provides a good balance of size and quality.
    const pdfSettings = '/ebook'; 

    const command = `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=${pdfSettings} -dNOPAUSE -dQUIET -dBATCH -sOutputFile=${outputPath} ${inputPath}`;

    console.log(chalk.blue(`[PDF Compressor] Compressing file: ${path.basename(inputPath)}`));
    exec(command, async (error, stdout, stderr) => {
      if (error) {
        console.warn(chalk.yellow('[PDF Compressor] Ghostscript command failed. This might mean Ghostscript is not installed on the server. Falling back to using the original file.'));
        console.warn(chalk.yellow(`Error details: ${error.message}`));
        try {
          await fs.promises.copyFile(inputPath, outputPath);
          resolve();
        } catch (copyError) {
          reject(new Error(`Ghostscript failed and could not copy original file: ${copyError.message}`));
        }
        return;
      }
      
      if (stderr) {
        console.log(chalk.gray(`[PDF Compressor] Ghostscript stderr: ${stderr}`));
      }
      
      console.log(chalk.green(`[PDF Compressor] Successfully compressed PDF to: ${path.basename(outputPath)}`));
      resolve();
    });
  });
};


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

// New helper for associates to merge base fields and custom JSON fields
const parseAssociate = (associate) => {
    if (!associate) return null;
    let customFields = {};
    if (associate.custom_fields && typeof associate.custom_fields === 'string') {
        try {
            customFields = JSON.parse(associate.custom_fields);
        } catch (e) {
            console.error(`Failed to parse custom_fields JSON for associate ID ${associate.id}:`, associate.custom_fields);
        }
    } else if (associate.custom_fields && typeof associate.custom_fields === 'object') {
        // For MySQL which might auto-parse JSON
        customFields = associate.custom_fields;
    }

    let extraCustomFields = {};
    if (associate.extra_custom_fields && typeof associate.extra_custom_fields === 'string') {
        try {
            extraCustomFields = JSON.parse(associate.extra_custom_fields);
        } catch (e) {
            console.error(`Failed to parse extra_custom_fields JSON for associate ID ${associate.id}:`, associate.extra_custom_fields);
        }
    } else if (associate.extra_custom_fields && typeof associate.extra_custom_fields === 'object') {
        extraCustomFields = associate.extra_custom_fields;
    }
    
    // Combine base fields with custom fields, and remove sensitive/internal fields
    const { custom_fields, extra_custom_fields, password, ...baseAssociate } = associate;
    return { ...baseAssociate, ...customFields, ...extraCustomFields };
};


const slugify = (text) => {
    if (!text) return '';
    return text.toString().toLowerCase()
        .replace(/\s+/g, '_')           // Replace spaces with _
        .replace(/[^\w-]+/g, '')       // Remove all non-word chars
        .replace(/--+/g, '_')         // Replace multiple - with single _
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '');            // Trim - from end of text
};


// --- Multer Setup for File Uploads ---
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Store files temporarily in a general uploads folder
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tempDir = path.join(UPLOAD_DIR, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    cb(null, randomUUID());
  }
});

const upload = multer({ storage: storage });


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
        const mode = getDbMode();
        res.json({ mode });
    } catch (err) {
        console.error(chalk.red(`[GET /settings/seishat/db-mode] Error fetching db mode:`), err.message);
        next(err);
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

const separateAssociateData = async (type, allData) => {
    const mainLayoutFieldsQuery = `
        SELECT ff.field_name, ff.is_base_field
        FROM form_layout_fields flf
        JOIN form_fields ff ON flf.field_id = ff.id
        JOIN form_steps fs ON flf.step_id = fs.id
        WHERE fs.associate_type = ? AND fs.layout_type = 'main'
    `;
    const mainFields = await seishatQuery(mainLayoutFieldsQuery, [type]);

    const extraLayoutFieldsQuery = `
        SELECT ff.field_name
        FROM form_layout_fields flf
        JOIN form_fields ff ON flf.field_id = ff.id
        JOIN form_steps fs ON flf.step_id = fs.id
        WHERE fs.associate_type = ? AND fs.layout_type = 'extra'
    `;
    const extraFields = await seishatQuery(extraLayoutFieldsQuery, [type]);
    
    const baseFieldNames = mainFields.filter(f => f.is_base_field).map(f => f.field_name);
    const mainCustomFieldNames = mainFields.filter(f => !f.is_base_field).map(f => f.field_name);
    const extraCustomFieldNames = extraFields.map(f => f.field_name);
    
    const baseData = {};
    const customData = {};
    const extraCustomData = {};
    
    for (const key in allData) {
        if (key === 'id') continue;
        if (baseFieldNames.includes(key) || ['full_name', 'password', 'type', 'cpf', 'whatsapp'].includes(key)) {
            baseData[key] = allData[key];
        } else if (mainCustomFieldNames.includes(key)) {
            customData[key] = allData[key];
        } else if (extraCustomFieldNames.includes(key)) {
            extraCustomData[key] = allData[key];
        }
    }
    
    return { baseData, customData, extraCustomData };
};


router.post('/seishat/associates/check-duplicates', async (req, res, next) => {
    const { cpf, whatsapp, excludeId } = req.body;
    
    try {
        const conditions = [];
        const params = [];

        if (cpf) {
            conditions.push('cpf = ?');
            params.push(cpf);
        }
        if (whatsapp) {
            conditions.push('whatsapp = ?');
            params.push(whatsapp);
        }

        if (conditions.length === 0) {
            return res.json({ isDuplicate: false });
        }

        let queryBase = `SELECT id, full_name, cpf, whatsapp FROM associates WHERE (${conditions.join(' OR ')})`;

        if (excludeId) {
            queryBase += ' AND id != ?';
            params.push(excludeId);
        }

        const duplicates = await seishatQuery(queryBase, params);

        if (duplicates.length > 0) {
            const firstDuplicate = duplicates[0];
            let field = 'unknown';
            let message = `Este valor já está em uso pelo associado: ${firstDuplicate.full_name}.`;
            if (firstDuplicate.cpf && firstDuplicate.cpf === cpf) {
                field = 'cpf';
                message = `Este CPF já está cadastrado para o associado: ${firstDuplicate.full_name}.`;
            } else if (firstDuplicate.whatsapp && firstDuplicate.whatsapp === whatsapp) {
                field = 'whatsapp';
                message = `Este WhatsApp já está cadastrado para o associado: ${firstDuplicate.full_name}.`;
            }
            return res.json({ isDuplicate: true, field, message });
        }

        return res.json({ isDuplicate: false });
    } catch (err) {
        console.error(chalk.red(`[${req.method} ${req.originalUrl}] Error checking duplicates:`), err.message);
        next(err);
    }
});

router.get('/seishat/associates', async (req, res, next) => {
    const { search } = req.query;
    try {
        let sql, params;
        const selectFields = 'id, full_name, cpf, whatsapp, type, custom_fields, extra_custom_fields';
        if (search) {
            const searchTerm = `%${search}%`;
            sql = `SELECT ${selectFields} FROM associates WHERE full_name LIKE ? OR cpf LIKE ? ORDER BY full_name ASC`;
            params = [searchTerm, searchTerm];
        } else {
            sql = `SELECT ${selectFields} FROM associates ORDER BY full_name ASC`;
            params = [];
        }
        const associates = await seishatQuery(sql, params);
        res.json(associates.map(parseAssociate));
    } catch (err) {
        console.error(chalk.red(`[${req.method} ${req.originalUrl}] Error fetching associates:`), err.message);
        next(err);
    }
});

router.post('/seishat/associates', async (req, res, next) => {
    try {
        const { type, ...allData } = req.body;
        const { baseData, customData, extraCustomData } = await separateAssociateData(type, allData);

        if (!baseData.full_name || !baseData.password || !type) {
            return res.status(400).json({ error: 'Nome completo, senha e tipo são obrigatórios.' });
        }
        
        const dbMode = getDbMode();
        let newAssociateId;

        const result = await seishatQuery(
            'INSERT INTO associates (full_name, cpf, whatsapp, password, type, custom_fields, extra_custom_fields) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [baseData.full_name, baseData.cpf || null, baseData.whatsapp || null, baseData.password, type, JSON.stringify(customData), JSON.stringify(extraCustomData)]
        );
        
        newAssociateId = (dbMode === 'mysql') ? result.insertId : result.lastInsertRowid;

        // Automatically create a root folder for the new associate
        const folderName = `#${newAssociateId}_${slugify(baseData.full_name)}`;
        await seishatQuery(
            'INSERT INTO documents_folders (associate_id, name, parent_folder_id) VALUES (?, ?, NULL)',
            [newAssociateId, folderName]
        );

        const newAssociate = { id: newAssociateId, type, ...baseData, ...customData, ...extraCustomData };
        delete newAssociate.password;
        res.status(201).json(newAssociate);
    } catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE' || (err.code && err.code.includes('ER_DUP_ENTRY'))) {
            return res.status(409).json({ error: 'Um associado com este CPF ou WhatsApp já existe.' });
        }
        console.error(chalk.red(`[${req.method} ${req.originalUrl}] Error creating associate:`), err.message);
        next(err);
    }
});

router.put('/seishat/associates/:id', async (req, res, next) => {
    const { id } = req.params;
    try {
        const { type, ...allData } = req.body;
        const { baseData, customData, extraCustomData } = await separateAssociateData(type, allData);

        if (!baseData.full_name || !type) {
            return res.status(400).json({ error: 'Nome completo e tipo são obrigatórios.' });
        }

        let sql, params;
        if (baseData.password) {
            sql = 'UPDATE associates SET full_name = ?, cpf = ?, whatsapp = ?, password = ?, type = ?, custom_fields = ?, extra_custom_fields = ? WHERE id = ?';
            params = [baseData.full_name, baseData.cpf || null, baseData.whatsapp || null, baseData.password, type, JSON.stringify(customData), JSON.stringify(extraCustomData), id];
        } else {
            sql = 'UPDATE associates SET full_name = ?, cpf = ?, whatsapp = ?, type = ?, custom_fields = ?, extra_custom_fields = ? WHERE id = ?';
            params = [baseData.full_name, baseData.cpf || null, baseData.whatsapp || null, type, JSON.stringify(customData), JSON.stringify(extraCustomData), id];
        }
        await seishatQuery(sql, params);
        
        const updatedAssociate = { id: parseInt(id), type, ...baseData, ...customData, ...extraCustomData };
        delete updatedAssociate.password;
        res.status(200).json(updatedAssociate);
    } catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE' || (err.code && err.code.includes('ER_DUP_ENTRY'))) {
            return res.status(409).json({ error: 'Um associado com este CPF ou WhatsApp já existe.' });
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
        const fields = await seishatQuery('SELECT * FROM form_fields ORDER BY is_base_field DESC, label ASC');
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
                'INSERT INTO form_fields (field_name, label, field_type, options, is_base_field, is_deletable) VALUES (?, ?, ?, ?, 0, 1)',
                [field_name, label, field_type, options ? JSON.stringify(options) : null]
            );
            const [newField] = await seishatQuery('SELECT * FROM form_fields WHERE id = ?', [result.lastInsertRowid]);
            res.status(201).json(newField);
        } else { // mysql2
            const result = await seishatQuery(
                'INSERT INTO form_fields (field_name, label, field_type, options, is_base_field, is_deletable) VALUES (?, ?, ?, ?, 0, 1)',
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

// PUT /api/admin/fields/:id - Update a custom field in the catalog
router.put('/admin/fields/:id', async (req, res, next) => {
    const { id } = req.params;
    const { label, field_type, options } = req.body;

    if (!label || !field_type) {
        return res.status(400).json({ error: 'Label and field type are required.' });
    }

    try {
        const [field] = await seishatQuery('SELECT is_deletable FROM form_fields WHERE id = ?', [id]);

        if (!field) {
            return res.status(404).json({ error: 'Campo não encontrado.' });
        }

        if (!field.is_deletable) {
            return res.status(403).json({ error: 'Este campo é essencial e não pode ser editado.' });
        }

        const optionsToStore = (field_type === 'select' || field_type === 'radio' || field_type === 'brazilian_states_select') ? JSON.stringify(options) : null;

        await seishatQuery(
            'UPDATE form_fields SET label = ?, field_type = ?, options = ? WHERE id = ?',
            [label, field_type, optionsToStore, id]
        );

        const [updatedField] = await seishatQuery('SELECT * FROM form_fields WHERE id = ?', [id]);
        res.status(200).json(updatedField);

    } catch (err) {
        console.error(chalk.red(`[PUT /admin/fields/${id}] Error updating custom field:`), err.message);
        next(err);
    }
});


// DELETE /api/admin/fields/:id - Delete a custom field from the catalog
router.delete('/admin/fields/:id', async (req, res, next) => {
    const { id } = req.params;
    try {
        const [field] = await seishatQuery('SELECT is_deletable FROM form_fields WHERE id = ?', [id]);

        if (!field) {
            return res.status(404).json({ error: 'Campo não encontrado.' });
        }

        if (!field.is_deletable) {
            return res.status(403).json({ error: 'Este campo é essencial e não pode ser excluído.' });
        }
        
        await seishatQuery('DELETE FROM form_fields WHERE id = ?', [id]);
        
        res.status(204).send();
    } catch (err) {
        console.error(chalk.red(`[DELETE /admin/fields/${id}] Error deleting custom field:`), err.message);
        next(err);
    }
});


// GET /api/admin/layouts/:type - Get the form layout for an associate type
router.get('/admin/layouts/:type', async (req, res, next) => {
    const { type } = req.params;
    try {
        const fetchStepsForLayout = async (layoutType) => {
            const steps = await seishatQuery('SELECT * FROM form_steps WHERE associate_type = ? AND layout_type = ? ORDER BY step_order ASC', [type, layoutType]);
            for (const step of steps) {
                const fieldsQuery = `
                    SELECT ff.*, flf.is_required, flf.display_order, flf.visibility_conditions
                    FROM form_layout_fields flf
                    JOIN form_fields ff ON flf.field_id = ff.id
                    WHERE flf.step_id = ?
                    ORDER BY flf.display_order ASC
                `;
                const fields = await seishatQuery(fieldsQuery, [step.id]);
                step.fields = fields.map(f => ({
                    ...f,
                    visibility_conditions: f.visibility_conditions ? JSON.parse(f.visibility_conditions) : null
                }));
            }
            return steps;
        };
        
        const mainLayout = await fetchStepsForLayout('main');
        const extraLayout = await fetchStepsForLayout('extra');

        res.json({ main: mainLayout, extra: extraLayout });

    } catch (err) {
        console.error(chalk.red(`[${req.method} ${req.originalUrl}] Error fetching form layout for type ${type}:`), err.message);
        next(err);
    }
});


// PUT /api/admin/layouts/:type - Save the entire layout for an associate type
router.put('/admin/layouts/:type', async (req, res, next) => {
    const { type } = req.params;
    const { main, extra } = req.body;

    if (!Array.isArray(main) || !Array.isArray(extra)) {
        return res.status(400).json({ error: 'Request body must be an object with "main" and "extra" arrays of steps.' });
    }
    
    const db = getSeishatDb();
    
    const saveLayout = async (stepsLayout, layoutType, conn) => {
        for (const [stepIndex, step] of stepsLayout.entries()) {
            if (getDbMode() === 'sqlite') {
                const { lastInsertRowid: stepId } = await seishatQuery(
                    'INSERT INTO form_steps (associate_type, title, step_order, layout_type) VALUES (?, ?, ?, ?)',
                    [type, step.title, stepIndex, layoutType]
                );
                 if (step.fields && step.fields.length > 0) {
                    const insertFieldStmt = db.prepare('INSERT INTO form_layout_fields (step_id, field_id, display_order, is_required, visibility_conditions) VALUES (?, ?, ?, ?, ?)');
                    for (const [fieldIndex, field] of step.fields.entries()) {
                        insertFieldStmt.run(stepId, field.id, fieldIndex, field.is_required ? 1 : 0, JSON.stringify(field.visibility_conditions || null));
                    }
                }
            } else { // mysql
                const [stepResult] = await conn.query('INSERT INTO form_steps (associate_type, title, step_order, layout_type) VALUES (?, ?, ?, ?)', [type, step.title, stepIndex, layoutType]);
                const stepId = stepResult.insertId;
                if (step.fields && step.fields.length > 0) {
                    const fieldValues = step.fields.map((field, fieldIndex) => [stepId, field.id, fieldIndex, field.is_required ? 1 : 0, JSON.stringify(field.visibility_conditions || null)]);
                    await conn.query('INSERT INTO form_layout_fields (step_id, field_id, display_order, is_required, visibility_conditions) VALUES ?', [fieldValues]);
                }
            }
        }
    };
    
    try {
        if (db.constructor.name === 'Database') { // better-sqlite3
            const runTransaction = db.transaction(() => {
                const existingSteps = db.prepare('SELECT id FROM form_steps WHERE associate_type = ?').all(type);
                if (existingSteps.length > 0) {
                    const stepIds = existingSteps.map(s => s.id);
                    const placeholders = stepIds.map(() => '?').join(',');
                    db.prepare(`DELETE FROM form_layout_fields WHERE step_id IN (${placeholders})`).run(...stepIds);
                    db.prepare('DELETE FROM form_steps WHERE associate_type = ?').run(type);
                }
                saveLayout(main, 'main');
                saveLayout(extra, 'extra');
            });
            runTransaction();
        } else { // mysql2
            const conn = await db.getConnection();
            await conn.beginTransaction();
            const [existingSteps] = await conn.query('SELECT id FROM form_steps WHERE associate_type = ?', [type]);
            if (existingSteps.length > 0) {
                const stepIds = existingSteps.map(s => s.id);
                await conn.query('DELETE FROM form_layout_fields WHERE step_id IN (?)', [stepIds]);
                await conn.query('DELETE FROM form_steps WHERE associate_type = ?', [type]);
            }

            await saveLayout(main, 'main', conn);
            await saveLayout(extra, 'extra', conn);
            
            await conn.commit();
            conn.release();
        }
        res.status(200).json({ success: true, message: `Layout for ${type} saved.` });
    } catch (err) {
        console.error(chalk.red(`[${req.method} ${req.originalUrl}] Error saving form layout for type ${type}:`), err.message);
        next(err);
    }
});

// --- Seishat Documents Routes ---

// GET /api/seishat/documents - Get contents of a folder
router.get('/seishat/documents', async (req, res, next) => {
    const { parentFolderId } = req.query; // null or 'null' or undefined for root

    try {
        let folders, files;
        const parentId = (parentFolderId === 'null' || !parentFolderId) ? null : parentFolderId;
        
        if (parentId) {
            folders = await seishatQuery('SELECT id, name, "folder" as type FROM documents_folders WHERE parent_folder_id = ? ORDER BY name ASC', [parentId]);
            files = await seishatQuery('SELECT id, original_name as name, "file" as type, size_bytes FROM documents_files WHERE folder_id = ? ORDER BY original_name ASC', [parentId]);
        } else {
            // Root level shows associate folders
            folders = await seishatQuery('SELECT id, name, "folder" as type FROM documents_folders WHERE parent_folder_id IS NULL ORDER BY name ASC');
            files = []; // No files at the absolute root
        }
        
        const formatFileSize = (bytes) => {
            if (!bytes || bytes === 0) return '';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        };

        const formattedFiles = files.map(file => ({ ...file, size: formatFileSize(file.size_bytes) }));

        res.json([...folders, ...formattedFiles]);
    } catch (err) {
        console.error(chalk.red(`[${req.method} ${req.originalUrl}] Error fetching documents:`), err.message);
        next(err);
    }
});


// DELETE /api/seishat/documents/:type/:id - Delete a file or folder
router.delete('/seishat/documents/:type/:id', async (req, res, next) => {
    const { type, id } = req.params;
    try {
        if (type === 'folder') {
            // Note: ON DELETE CASCADE will handle child files/folders in DB.
            // A real implementation would also need to delete files from storage.
            await seishatQuery('DELETE FROM documents_folders WHERE id = ?', [id]);
        } else if (type === 'file') {
            // A real implementation would find stored_name and delete from storage.
            await seishatQuery('DELETE FROM documents_files WHERE id = ?', [id]);
        } else {
            return res.status(400).json({ error: 'Invalid type specified.' });
        }
        res.status(204).send();
    } catch (err) {
        console.error(chalk.red(`[${req.method} ${req.originalUrl}] Error deleting document:`), err.message);
        next(err);
    }
});

// POST /api/seishat/documents/upload - Upload a file
router.post('/seishat/documents/upload', upload.single('file'), async (req, res, next) => {
    const { associate_id, document_type } = req.body;
    const file = req.file;

    if (!file || !associate_id || !document_type) {
        if (file) await fs.promises.unlink(file.path).catch(console.error);
        return res.status(400).json({ error: 'Missing file, associate_id, or document_type.' });
    }

    const tempPath = file.path;

    try {
        const [rootFolder] = await seishatQuery('SELECT id FROM documents_folders WHERE associate_id = ? AND parent_folder_id IS NULL', [associate_id]);
        if (!rootFolder) {
            throw new Error('Root folder for this associate not found.');
        }
        const folder_id = rootFolder.id;

        const fileExtension = path.extname(file.originalname).toLowerCase();
        const stored_name = `${randomUUID()}${fileExtension}`;
        const final_dir = path.join(UPLOAD_DIR, String(associate_id));
        const final_path = path.join(final_dir, stored_name);
        
        await fs.promises.mkdir(final_dir, { recursive: true });

        if (file.mimetype === 'application/pdf') {
            const compressedPath = `${tempPath}-compressed.pdf`;
            await compressPdf(tempPath, compressedPath);
            await fs.promises.rename(compressedPath, final_path);
        } else {
            await fs.promises.rename(tempPath, final_path);
        }

        const stats = await fs.promises.stat(final_path);
        const size_bytes = stats.size;
        
        // Define a mapping for user-friendly filenames
        const documentTypeMap = {
            personalDocPatient: 'documento_pessoal_paciente',
            addressDoc: 'comprovante_endereco',
            termDoc: 'termo_associativo',
            personalDocGuardian: 'documento_pessoal_responsavel',
        };
        const original_name_base = documentTypeMap[document_type] || document_type;
        const original_name = `${original_name_base}${fileExtension}`;

        const dbMode = getDbMode();
        if (dbMode === 'mysql') {
            const insertQuery = `
                INSERT INTO documents_files (folder_id, associate_id, original_name, stored_name, mime_type, size_bytes)
                VALUES (?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                stored_name = VALUES(stored_name), 
                mime_type = VALUES(mime_type), 
                size_bytes = VALUES(size_bytes), 
                updated_at = CURRENT_TIMESTAMP
            `;
            await seishatQuery(insertQuery, [folder_id, associate_id, original_name, stored_name, file.mimetype, size_bytes]);
        } else { // sqlite
            const insertQuery = `
                INSERT INTO documents_files (folder_id, associate_id, original_name, stored_name, mime_type, size_bytes)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(folder_id, original_name) DO UPDATE SET
                stored_name = excluded.stored_name,
                mime_type = excluded.mime_type,
                size_bytes = excluded.size_bytes,
                updated_at = datetime('now', 'localtime')
            `;
            await seishatQuery(insertQuery, [folder_id, associate_id, original_name, stored_name, file.mimetype, size_bytes]);
        }
        
        res.status(201).json({ success: true, message: 'File uploaded successfully.' });
    } catch (err) {
        console.error(chalk.red(`[${req.method} ${req.originalUrl}] Error uploading file:`), err.message);
        next(err);
    } finally {
        // Final cleanup of the original temp file
        await fs.promises.unlink(tempPath).catch(e => console.error("Failed to clean up temp file:", e.message));
    }
});


module.exports = router;