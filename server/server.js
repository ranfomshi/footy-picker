const express = require('express');
const path = require('path');
const { sequelize } = require('./models');
const routes = require('./routes');
const app = express();

app.use(express.json()); // Middleware to parse JSON requests
app.use(express.static(path.join(__dirname, '../client/footy-client/dist')));

app.use('/api', routes);

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/footy-client/dist/index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
    await sequelize.authenticate();
    await sequelize.sync(); // Ensure models are synced with the database
    console.log(`Server is running on port ${PORT}`);
});
