const express = require('express');
const mongoose = require('mongoose');
const Logger = require('./logger/logger');
const urlRoutes = require('./route/urlRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

mongoose.connect('mongodb://localhost:27017/urlshortener', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    Logger.log('info', 'db', 'Connected to MongoDB');
    console.log('Connected to MongoDB');
})
.catch((error) => {
    Logger.log('error', 'db', 'MongoDB connection error');
    console.error('MongoDB connection error:', error);
    process.exit(1);
});

// Mount routes
app.use('/', urlRoutes);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    Logger.log('info', 'service', `Server started on port ${PORT}`);
});