const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config(); // Load environment variables from .env file

const { sequelize } = require('./models'); // Import the initialized sequelize instance

const app = express();

// ─── DISABLE CORS RESTRICTIONS ─────────────────────────────────────────
// Allow all origins, headers, and methods
app.use(cors());
app.options('*', cors());

// Request logger
app.use((req, res, next) => {
    console.log(`🛰️ ${req.method} ${req.originalUrl}`);
    next();
});

app.use(express.json());

// Serve static files from the Vite build directory
app.use(express.static(path.join(__dirname, '../client/footy-client/dist')));

// API routes
app.use('/api', require('./routes'));

// Catch-all handler to serve the React app
app.get('*', (req, res) => {
    console.log(`Catch-all handler triggered for URL: ${req.originalUrl}`);
    res.sendFile(path.join(__dirname, '../client/footy-client/dist/index.html'), (err) => {
        if (err) {
            console.error('Error serving index.html:', err);
            res.status(500).send(err);
        }
    });
});

// Log environment variables to verify they are loaded correctly
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DATABASE_URL:', process.env.DATABASE_URL);
console.log('DATABASE_URL_DEV (use prod for now):', process.env.DATABASE_URL);

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`);
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');
        if (process.env.NODE_ENV !== 'production') {
            await sequelize.sync({ alter: true });
            console.log('Database synchronized (dev only).');
        } else {
            console.log('Skipping sync in production – relying on migrations.');
        }
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
});