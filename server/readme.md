# SATIVAR-ISIS Backend Server

This directory contains the Node.js/Express backend for the SATIVAR-ISIS application. Its primary responsibilities are:

1.  To provide a secure API for the frontend to interact with.
2.  To manage connections to the persistent databases.
3.  To act as a secure layer, protecting sensitive operations.

The backend uses a multi-database architecture:
- **Core, Chat, and Users:** These modules use dedicated SQLite databases (`sativar_isis.db`, `sativar_isis_chats.db`, `sativar_isis_users.db`) for simplicity and robustness. Initialization is automatic.
- **Seishat CRM Module:** This module can operate in two modes:
    1.  **SQLite (Default):** Uses its own `sativar_isis_seishat.db` file. Automatic initialization.
    2.  **MySQL (Optional):** Can be configured to connect to a MySQL server for enhanced scalability and multi-user performance. This is activated via the application's UI.

## Getting Started

### 1. Installation

Navigate to this directory and install the required npm packages:

```bash
cd server
npm install
```

### 2. Environment Variables

Create a file named `.env` in this directory (`/server/.env`). This file will hold your security keys and database credentials. **This file should never be committed to version control.**

#### Example `.env`

```env
# --- GENERAL SETTINGS ---
# The port the server will run on. Defaults to 3001.
PORT=3001

# --- SECURITY ---
# A long, random, secret key to authenticate requests between the frontend and backend.
# This key MUST match the VITE_API_SECRET_KEY configured in the frontend's environment.
API_SECRET_KEY=generate-a-strong-random-string-for-this

# --- OPTIONAL: MySQL Database for Seishat Module ---
# Uncomment and fill these variables if you plan to activate MySQL mode for the Seishat CRM.
# DB_HOST=localhost
# DB_USER=your_mysql_user
# DB_PASSWORD=your_mysql_password
# DB_DATABASE=your_seishat_database_name
```

### 3. Database Initialization

The backend handles database setup through a migration script. How you proceed depends on the database you want to use for the Seishat module.

#### SQLite (Default Mode - Automatic Setup)

This is the default and recommended setup for development and single-user environments. **No manual steps are required.**

-   **How it works:** Simply starting the server is enough.
-   **Command:**
    ```bash
    npm run dev
    ```
-   **What it does:** The server automatically executes the JavaScript migration file (`server/migration.js`). This script creates the `/server/data` directory and all necessary SQLite database files (`.db`) with their correct tables.

---

#### MySQL (Optional Mode for Seishat - Manual Setup Required)

This is an advanced option for production or multi-user environments. It requires manual preparation of the MySQL database **before** activating it in the application UI.

**Step 1: Prepare your MySQL Server**
1.  Ensure you have a running MySQL server.
2.  Create a new database (e.g., `sativar_seishat_db`).
3.  Create a database user with full privileges for that database.
4.  Update your `server/.env` file with the correct `DB_HOST`, `DB_USER`, `DB_PASSWORD`, and `DB_DATABASE` credentials.

**Step 2: Run the SQL Schema Script**
Connect to your newly created database using a MySQL client and execute the entire script below. This will create all the necessary tables for the Seishat module.

**Nota sobre a Geração de IDs:** O sistema é projetado para que o banco de dados gerencie a criação de IDs únicos e sequenciais para registros como `associates`. A coluna `id` é definida como `AUTO_INCREMENT`, garantindo que cada novo associado receba um número de identificação único sem a necessidade de intervenção da aplicação, o que assegura a integridade dos dados.

```sql
-- Creates the 'products' table for the Seishat CRM module.
CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Creates the 'associates' table for the Seishat CRM module.
-- The 'id' is an auto-incrementing integer, ensuring a unique, sequential identifier for each associate.
-- A `custom_fields` column is added to store dynamic data from the Form Builder.
CREATE TABLE IF NOT EXISTS associates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  cpf VARCHAR(14) UNIQUE,
  whatsapp VARCHAR(255),
  password VARCHAR(255) NOT NULL,
  type ENUM('paciente', 'responsavel', 'tutor', 'colaborador') NOT NULL,
  custom_fields JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table for the central catalog of all possible form fields.
-- This table is part of the new Form Builder feature.
CREATE TABLE IF NOT EXISTS form_fields (
  id INT AUTO_INCREMENT PRIMARY KEY,
  field_name VARCHAR(255) NOT NULL UNIQUE,
  label VARCHAR(255) NOT NULL,
  field_type ENUM('text', 'email', 'select', 'password', 'textarea', 'checkbox', 'radio', 'separator', 'brazilian_states_select') NOT NULL,
  is_base_field BOOLEAN NOT NULL DEFAULT FALSE,
  is_deletable BOOLEAN NOT NULL DEFAULT FALSE,
  options TEXT -- For select/radio fields, store as JSON string
);

-- Table for the steps/pages within a form.
-- This table is part of the new Form Builder feature.
CREATE TABLE IF NOT EXISTS form_steps (
  id INT AUTO_INCREMENT PRIMARY KEY,
  associate_type VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  step_order INT NOT NULL
);

-- Table that links fields to steps to define a form's layout.
-- This table is part of the new Form Builder feature.
CREATE TABLE IF NOT EXISTS form_layout_fields (
  id INT AUTO_INCREMENT PRIMARY KEY,
  step_id INT NOT NULL,
  field_id INT NOT NULL,
  display_order INT NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  visibility_conditions TEXT,
  FOREIGN KEY (step_id) REFERENCES form_steps(id) ON DELETE CASCADE,
  FOREIGN KEY (field_id) REFERENCES form_fields(id) ON DELETE CASCADE
);

-- Adds indexes for better performance. Note: MySQL does not support "IF NOT EXISTS" for indexes.
-- If an index already exists, this command will produce an error that can be safely ignored.
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_associates_full_name ON associates(full_name);
CREATE INDEX idx_associates_cpf ON associates(cpf);
CREATE INDEX idx_form_steps_associate_type ON form_steps(associate_type);
CREATE INDEX idx_form_layout_fields_step_id ON form_layout_fields(step_id);

-- Pre-populates the 'form_fields' table with core, non-deletable fields.
-- This ensures the application starts with a functional base configuration.
INSERT INTO form_fields (id, field_name, label, field_type, is_base_field, is_deletable, options) VALUES
(1, 'full_name', 'Nome Completo', 'text', TRUE, FALSE, NULL),
(2, 'password', 'Senha', 'password', TRUE, FALSE, NULL),
(3, 'type', 'Tipo de Associado', 'select', TRUE, FALSE, '["paciente", "responsavel", "tutor", "colaborador"]'),
(4, 'cpf', 'CPF', 'text', TRUE, FALSE, NULL),
(5, 'whatsapp', 'WhatsApp', 'text', TRUE, FALSE, NULL)
ON DUPLICATE KEY UPDATE 
  label=VALUES(label), 
  field_type=VALUES(field_type), 
  is_base_field=VALUES(is_base_field), 
  is_deletable=VALUES(is_deletable), 
  options=VALUES(options);
```

After running this script, you can start the server and use the application's interface ("Configurações Avançadas") to test the connection and formally activate the MySQL mode.

### 4. Running the Server

-   **For development (with automatic restart on file changes):**
    ```bash
    npm run dev
    ```

-   **For production:**
    ```bash
    npm start
    ```

The server will start on the port specified in your `.env` file (or `3001` by default).