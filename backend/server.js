require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { GoogleGenAI } = require('@google/genai'); // 1. Import GoogleGenAI

const authRoutes = require('./routes/auth');
const storyRoutes = require('./routes/stories');

const app = express();
app.use(cors());
app.use(express.json());

// 2. Initialize Gemini AI Client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// 3. Attach AI client to app locals so it can be accessed in route handlers
app.locals.ai = ai;
console.log(process.env.GEMINI_API_KEY ? 'Gemini AI Client initialized.' : 'WARNING: GEMINI_API_KEY not found in .env.');


app.get('/', (req, res) => {
  res.json({ message: 'Tale-Forger API is running' });
});

app.use('/api/auth', authRoutes);
// The storyRoutes will now access the AI client via req.app.locals.ai
app.use('/api/stories', storyRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

const uri = process.env.MONGO_URI;
console.log('Attempting to connect with URI:', uri);
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
  });
