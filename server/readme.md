# SATIVAR-ISIS Backend Server

This directory contains the Node.js/Express backend for the SATIVAR-ISIS application. Its primary responsibilities are:

1.  To provide a secure API for the frontend to interact with.
2.  To manage the connection and queries to persistent **SQLite** databases for all application data (settings, reminders, users, products, etc.).
3.  To act as a secure layer, protecting sensitive operations.

## Getting Started

### 1. Installation

Navigate to this directory and install the required npm packages:

```bash
cd server
npm install
```

### 2. Environment Variables

Create a file named `.env` in this directory (`/server/.env`). This file will hold your security keys. **This file should never be committed to version control.**

#### Example `.env`

```env
# --- GENERAL SETTINGS ---
# The port the server will run on. Defaults to 3001.
PORT=3001

# --- SECURITY ---
# A long, random, secret key to authenticate requests between the frontend and backend.
# This key MUST match the VITE_API_SECRET_KEY configured in the frontend's environment.
API_SECRET_KEY=generate-a-strong-random-string-for-this
```

### 3. Database Initialization

**This step is now automatic!**

When you start the server for the first time, it will automatically create a `data` directory and all necessary database files (e.g., `sativar_isis.db`) inside it. It will also run the required migrations to create the tables.

### 4. Running the Server

-   **For development (with automatic restart on file changes):**
    ```bash
    npm run dev
    ```

-   **For production:**
    ```bash
    npm start
    ```

The server will start on the port specified in your `.env` file (or `3001` by default) and will use the self-contained SQLite databases.
