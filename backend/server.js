require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { GoogleGenAI } = require('@google/genai');

const authRoutes = require('./routes/auth');
const storyRoutes = require('./routes/stories');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Gemini AI Client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
app.locals.ai = ai;
console.log(process.env.GEMINI_API_KEY ? '✅ Gemini AI initialized' : '⚠️ Missing GEMINI_API_KEY');

// Routes
app.get('/', (req, res) => res.json({ message: 'Tale-Forger API is running' }));
app.use('/api/auth', authRoutes);
app.use('/api/stories', storyRoutes);

// MongoDB Connection + Server Start
const PORT = process.env.PORT || 5000;
const uri = process.env.MONGO_URI;

console.log('Connecting to MongoDB...');
mongoose
  .connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => console.error('❌ MongoDB connection error:', err));
