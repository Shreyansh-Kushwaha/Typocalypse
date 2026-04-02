import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { body, validationResult } from "express-validator";
import User from "./models/User.js";
import Game from "./models/Game.js";

dotenv.config();

const app = express();
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/typocalypse')
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Auth routes
app.post('/auth/signup', [
  body('username').isLength({ min: 3, max: 50 }).withMessage('Username must be 3-50 characters').trim().escape(),
  body('email').isEmail().withMessage('Please enter a valid email').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(e => e.msg).join(', ');
      return res.status(400).json({ error: errorMessages });
    }

    const { username, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Create new user
    const user = new User({ username, email, password });
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: { id: user._id, username: user.username, email: user.email }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/auth/login', [
  body('email').isEmail().withMessage('Please enter a valid email').normalizeEmail(),
  body('password').exists().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(e => e.msg).join(', ');
      return res.status(400).json({ error: errorMessages });
    }

    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: { id: user._id, username: user.username, email: user.email }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Game routes
app.post('/game/start', authenticateToken, async (req, res) => {
  try {
    const { genre = 'fantasy' } = req.body;
    const userId = req.user.userId;

    if (!userId) {
      return res.status(400).json({ error: 'User ID not found in token' });
    }

    // Create new game session
    const game = new Game({
      userId,
      currentStory: '',
      choices: [],
      genre,
      progress: 0
    });

    await game.save();

    // Generate initial story
    let storyResponse;
    try {
      storyResponse = await generateStory(null, genre);
    } catch (storyError) {
      console.error('Story generation failed:', storyError.message);
      return res.status(500).json({ error: `Story generation failed: ${storyError.message}` });
    }
    
    if (!storyResponse || !storyResponse.paragraph) {
      return res.status(500).json({ error: 'Failed to generate story. Please try again.' });
    }
    
    game.currentStory = storyResponse.paragraph;
    game.choices = storyResponse.choices || [];
    await game.save();

    res.json({
      gameId: game._id,
      story: game.currentStory,
      choices: game.choices,
      progress: game.progress
    });
  } catch (error) {
    console.error('Start game error:', error);
    res.status(500).json({ error: error.message || 'Failed to start game' });
  }
});

app.post('/game/continue', authenticateToken, async (req, res) => {
  try {
    const { gameId, choice } = req.body;
    const userId = req.user.userId;

    const game = await Game.findOne({ _id: gameId, userId });
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // Generate next story based on choice
    const storyResponse = await generateStory(choice, game.genre);
    game.currentStory = storyResponse.paragraph;
    game.choices = storyResponse.choices;
    game.progress += 1;
    await game.save();

    res.json({
      story: game.currentStory,
      choices: game.choices,
      progress: game.progress
    });
  } catch (error) {
    console.error('Continue game error:', error);
    res.status(500).json({ error: 'Failed to continue game' });
  }
});

// Get user's games
app.get('/games', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const games = await Game.find({ userId }).sort({ updatedAt: -1 });
    res.json(games);
  } catch (error) {
    console.error('Get games error:', error);
    res.status(500).json({ error: 'Failed to fetch games' });
  }
});

// Legacy API routes (for backward compatibility)
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// Generate a story paragraph
app.post("/api/story", async (req, res) => {
  const { choice } = req.body;
  const genre = req.body.genre || 'fantasy';

  const prompt = choice
    ? `The player chose: ${choice}. Continue the ${genre} story. Write one short paragraph (10-20 words).`
    : `Start a ${genre} story. Write one short paragraph (10-20 words).`;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openrouter/auto",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 200
      })
    });

    const data = await response.json();
    const output = data.choices?.[0];
    const text = output?.message?.content || "Story generation failed";

    res.json({ paragraph: text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch story." });
  }
});

// Generate choices
app.post("/api/choices", async (req, res) => {
  const { lastParagraph } = req.body;
  const genre = req.body.genre || 'fantasy';

  const prompt = `Based on this paragraph:\n"${lastParagraph}"\nGenerate exactly 2 ${genre} story choices.
  Each choice must be one line only, between 10 and 15 words.
  Use easy and clear words only.
  Do not add numbering, extra text, or explanations.
  Just output the two choices as separate lines.`;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openrouter/auto",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 100
      })
    });

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || "";
    const options = raw.split("\n").filter(l => l.trim()).slice(0, 2);

    res.json({ choices: options });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch choices." });
  }
});

// Demo stories for testing - replace with API calls later
const demoStories = {
  fantasy: {
    opening: "You wake in a mystical forest with ancient trees surrounding you. A faint golden glow ahead calls you forward.",
    choices: ["Follow the golden light", "Explore the dark forest behind you"]
  },
  horror: {
    opening: "The abandoned mansion looms before you. Strange sounds echo from within the darkness.",
    choices: ["Enter through the front door", "Search for another way in"]
  },
  'sci-fi': {
    opening: "Your spacecraft lands on an unknown alien planet. The terrain glows with bioluminescent life.",
    choices: ["Exit the spacecraft to investigate", "Send a drone to scout first"]
  },
  mystery: {
    opening: "You find a locked chest in the attic with no key. Dust covers everything around it.",
    choices: ["Try to force it open", "Search for a hidden key"]
  },
  adventure: {
    opening: "The treasure map leads to a hidden canyon. You notice fresh footprints in the sand.",
    choices: ["Follow the footprints", "Ignore them and search the canyon"]
  },
  romance: {
    opening: "You meet someone at the cafe. Their eyes seem to hold a thousand stories.",
    choices: ["Start a conversation", "Write a note and leave it on their table"]
  },
  custom: {
    opening: "The story begins in an unexpected place. What happens next?",
    choices: ["Take action one", "Take action two"]
  }
};

// Helper function to generate story and choices
async function generateStory(choice, genre = 'fantasy') {
  try {
    console.log('Generating story for genre:', genre);
    
    const stories = demoStories[genre] || demoStories.fantasy;
    
    // For demo purposes, return the opening story on first call
    if (!choice) {
      return {
        paragraph: stories.opening,
        choices: stories.choices
      };
    }
    
    // For continuation, generate a simple response
    const continuations = [
      `You ${choice.toLowerCase()}. Something unexpected happens next.`,
      `As you ${choice.toLowerCase()}, you discover something remarkable.`,
      `Following your choice to ${choice.toLowerCase()}, new possibilities emerge.`
    ];
    
    const randContinuation = continuations[Math.floor(Math.random() * continuations.length)];
    
    return {
      paragraph: randContinuation,
      choices: [
        "Continue forward bravely",
        "Take a moment to think"
      ]
    };
  } catch (error) {
    console.error('Story generation error:', error.message);
    throw error;
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
