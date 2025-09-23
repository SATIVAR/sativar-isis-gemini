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

### 3. System Dependencies

-   **Ghostscript:** Required for server-side PDF compression. You must install Ghostscript on the server where this backend is running.
    -   **For Debian/Ubuntu:**
        ```bash
        sudo apt-get update && sudo apt-get install -y ghostscript
        ```
    -   **For macOS (using Homebrew):**
        ```bash
        brew install ghostscript
        ```
    -   **For Windows:** Download from the [official Ghostscript website](https://www.ghostscript.com/download.html).

    If Ghostscript is not found in the system's PATH, the backend will gracefully fall back to saving the original, uncompressed PDF file.

### 4. Database Initialization

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
Connect to your newly created database using a MySQL client and execute the entire script from the `docs/FILE_MANAGER_MYSQL.md` file. This will create all the necessary tables for the Seishat module.

After running this script, you can start the server and use the application's interface ("Configurações Avançadas") to test the connection and formally activate the MySQL mode.

### 5. Running the Server

-   **For development (with automatic restart on file changes):**
    ```bash
    npm run dev
    ```

-   **For production:**
    ```bash
    npm start
    ```

The server will start on the port specified in your `.env` file (or `3001` by default).