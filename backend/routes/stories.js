const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware'); // Authentication middleware
const Story = require('../models/Story'); // Mongoose Story model

// Max number of retries for the API call
const MAX_RETRIES = 3;

// Helper function to handle exponential backoff and retries
async function generateStoryWithRetry(ai, systemInstruction, userPrompt) {
  let lastError = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      console.log(`Attempting story generation (Attempt ${attempt + 1})...`);

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        config: {
          systemInstruction: { parts: [{ text: systemInstruction }] },
          // Set temperature higher for more creative writing
          temperature: 0.8, 
          // Set a decent max token limit for a short story (~1000-1500 words)
          maxOutputTokens: 5000 
        }
      });

      // Check if content was generated
      if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
        return response.candidates[0].content.parts[0].text;
      }
      
      // If no text, treat as a temporary failure
      throw new Error("API returned no text content.");

    } catch (error) {
      lastError = error;
      console.error(`Generation failed on attempt ${attempt + 1}:`, error.message);

      // Wait exponentially before retrying (1s, 2s, 4s, ...)
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // If all retries fail, throw the last error
  throw new Error(`Failed to generate content after ${MAX_RETRIES} attempts. Last error: ${lastError.message}`);
}


// Create story (GENERATE CONTENT VIA GEMINI API)
router.post('/', auth, async (req, res) => {
  const ai = req.app.locals.ai; // Get the initialized AI client from server.js

  try {
    const { title, hints, genres } = req.body;
    
    if (!title || !hints || !genres || !genres.length) {
      return res.status(400).json({ msg: 'Title, hints, and at least one genre are required.' });
    }

    if (!ai) {
      throw new Error("AI client not initialized on server.");
    }

    // --- 1. Construct the Generation Prompt ---
    const systemInstruction = `You are a professional, creative fiction author. Your task is to write a compelling, continuous short story based on the user's title, hints, and specified genre(s). The story must be engaging and flow naturally without using explicit chapter titles, subheadings, or bullet points. Do not include a title or any concluding commentary (like "The End"). Simply output the story text. Use a decent English vocabulary not too simple nor too complex.`;
    
    const userPrompt = `Story Title: "${title}"\nGenres: ${genres.join(', ')}\nCore Plot and Elements to Include (Hints): ${hints}`;

    // --- 2. Generate Content using Retry Logic ---
    const generatedContent = await generateStoryWithRetry(ai, systemInstruction, userPrompt);
    
    console.log('Story generation successful.');

    // --- 3. Save the Story to the Database ---
    const story = new Story({
      user: req.user.id,
      title,
      hints,
      genres,
      content: generatedContent // Store the actual generated content
    });

    await story.save();
    res.json(story);

  } catch (err) {
    console.error('Story Creation Error:', err.message || err);
    // Send a user-friendly error message if generation failed
    const statusCode = err.message && err.message.includes('Failed to generate content') ? 503 : 500;
    res.status(statusCode).json({ msg: err.message || 'Server error during story generation.' });
  }
});

// Get user's stories (no change needed here)
router.get('/', auth, async (req, res) => {
  try {
    const stories = await Story.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(stories);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// Update or regenerate a story
router.put('/:id', auth, async (req, res) => {
  const ai = req.app.locals.ai;
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ msg: 'Story not found' });
    if (story.user.toString() !== req.user.id) return res.status(403).json({ msg: 'Not authorized' });

    // If prompts provided, regenerate content using AI
    if (req.body.prompts && ai) {
      const systemInstruction = `You are a professional, creative fiction author. Regenerate or edit the following story content based on the user's prompts. Keep the same tone and continuity where possible unless the prompts request otherwise.`;
      const userPrompt = `Original Story Title: "${story.title}"\nOriginal Hints: ${story.hints}\nUser Edit Prompts: ${req.body.prompts}`;

      const generatedContent = await generateStoryWithRetry(ai, systemInstruction, userPrompt);
      story.content = generatedContent;
      story.hints = req.body.hints || story.hints;
      if (req.body.title) story.title = req.body.title;
      await story.save();
      return res.json(story);
    }

    // Otherwise, allow manual updates to fields like content/title/hints/genres
    const { content, title, hints, genres } = req.body;
    if (content !== undefined) story.content = content;
    if (title) story.title = title;
    if (hints) story.hints = hints;
    if (genres) story.genres = genres;

    await story.save();
    res.json(story);
  } catch (err) {
    console.error('Story update error:', err.message || err);
    res.status(500).json({ msg: 'Server error during story update.' });
  }
});

module.exports = router;
