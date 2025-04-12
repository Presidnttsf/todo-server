require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const connectToDatabase = require('./config/db');



const app = express();

const PORT = process.env.PORT;

// Middleware
app.use(cors());
app.use(express.json());

connectToDatabase(); // Connect to MongoDB

// Routes
app.get('/', (req, res) => {
  res.send('API is running...');
});
app.use('/auth', authRoutes);
app.use('/tasks', taskRoutes);

// Error handler (optional)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Server Start
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
