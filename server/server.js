const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config(); // Load environment variables from .env file

const { sequelize } = require('./models'); // Import the initialized sequelize instance

const app = express();

app.use((req, res, next) => {
    console.log(`🛰️ ${req.method} ${req.originalUrl}`);
    next();
});

const allowedOrigins = [
    /^http:\/\/localhost:\d+$/, // localhost on any port
    'https://teamix-4eb6acbc8b28.herokuapp.com',
    'https://footy-picker-58753c2f9639.herokuapp.com',
    'null'
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true); // e.g., Flutter or Postman
        const isAllowed = allowedOrigins.some(o =>
            typeof o === 'string' ? o === origin : o.test(origin)
        );
        if (isAllowed) return callback(null, true);
        callback(new Error('Not allowed by CORS: ' + origin));
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
}));
app.options('*', cors({
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
}));

app.options('*', cors()); // Handles all preflight requests

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
