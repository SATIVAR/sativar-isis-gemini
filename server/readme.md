# SATIVAR-ISIS Backend Server

This directory contains the Node.js/Express backend for the SATIVAR-ISIS application. Its primary responsibilities are:

1.  To provide a secure API for the frontend to interact with.
2.  To manage the connection and queries to a persistent MySQL database.
3.  To act as a secure layer, protecting database credentials from being exposed in the browser.

## Getting Started

### 1. Installation

Navigate to this directory and install the required npm packages:

```bash
cd server
npm install
```

### 2. Environment Variables

Create a file named `.env` in this directory (`/server/.env`). This file will hold your database credentials and security keys. **This file should never be committed to version control.**

#### Example for Remote MySQL

```env
# --- GENERAL SETTINGS ---
# The port the server will run on. Defaults to 3001.
# PORT=3001

# --- SECURITY ---
# A long, random, secret key to authenticate requests between the frontend and backend.
# This key MUST match the API_SECRET_KEY configured in the frontend environment.
API_SECRET_KEY=generate-a-strong-random-string-for-this

# --- DATABASE SELECTION ---
# This is now hardcoded to 'mysql'. This variable is no longer needed.
# DB_TYPE=mysql

# --- MYSQL CREDENTIALS ---
# Your database host (e.g., an IP address or a domain from your hosting provider).
DB_HOST=your-remote-database-host.com
# The port for your database (MySQL default is 3306).
DB_PORT=3306
# The username for your database.
DB_USER=your_db_user
# The password for your database user.
DB_PASSWORD=your_db_password
# The name of the database to use.
DB_NAME=sativar_isis_db

# --- SSL CONFIGURATION (For secure remote connections) ---
# Set to 'true' to enable SSL. Highly recommended for production/remote databases.
DB_SSL=true
# Set to 'false' only if your SSL certificate is self-signed (less secure).
DB_SSL_REJECT_UNAUTHORIZED=true
```

### 3. Database Initialization

Before starting the server for the first time, you must create the necessary tables in your database.

Please see the instructions in `server/init-db.md` for the correct `CREATE TABLE` statements for MySQL.

### 4. Running the Server

-   **For development (with automatic restart on file changes):**
    ```bash
    npm run dev
    ```

-   **For production:**
    ```bash
    npm start
    ```

The server will start on the port specified in your `.env` file (or `3001` by default) and attempt to connect to the MySQL database you configured.