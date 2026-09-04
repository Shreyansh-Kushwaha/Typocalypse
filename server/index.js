import express from "express";
import { createServer } from "http";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { body, validationResult } from "express-validator";
import User from "./models/User.js";
import Game from "./models/Game.js";
import { initMultiplayer } from "./multiplayer/index.js";
import { authenticateToken } from "./auth.js";
import { JWT_SECRET, corsOrigin } from "./config.js";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import progressRoutes from "./routes/progress.js";
import dailyRoutes from "./routes/daily.js";
import progressionRoutes from "./routes/progression.js";
import socialRoutes from "./routes/social.js";
import storiesRoutes from "./routes/stories.js";
import arcadeRoutes from "./routes/arcade.js";
import campaignRoutes from "./routes/campaign.js";
import notifyRoutes from "./routes/notify.js";
import tournamentRoutes from "./routes/tournaments.js";
import { startSeasonJob } from "./seasons.js";
import { startReminderJob } from "./notify.js";
import { initOg } from "./og.js";
import { streamStory, sse } from "./story.js";

dotenv.config();

const app = express();
app.set('trust proxy', 1); // behind Render/other proxies, for correct rate-limit IPs
app.use(helmet());
app.use(cors({
  origin: corsOrigin,
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));
app.use(express.json({ limit: '200kb' }));

// Abuse controls
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Try again in a few minutes.' },
});
const guestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many guest sessions from this address. Try again later.' },
});
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Slow down - too many story requests.' },
});

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/typocalypse')
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Stats, coach, leaderboard, ghosts, progression, social, library, arcade, campaign, notifications
app.use(progressRoutes);
app.use(dailyRoutes);
app.use(progressionRoutes);
app.use(socialRoutes);
app.use(storiesRoutes);
app.use(arcadeRoutes);
app.use(campaignRoutes);
app.use(notifyRoutes);
app.use(tournamentRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Auth routes
app.post('/auth/signup', authLimiter, [
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
      JWT_SECRET,
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

app.post('/auth/login', authLimiter, [
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
      JWT_SECRET,
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

// Guest access - mints a real account with no email or password
const GUEST_NAMES = ['Wanderer', 'Drifter', 'Nomad', 'Stray', 'Scavenger', 'Vagrant', 'Outrider', 'Straggler'];

app.post('/auth/guest', guestLimiter, async (req, res) => {
  try {
    let user = null;
    for (let attempt = 0; attempt < 10 && !user; attempt++) {
      const base = GUEST_NAMES[Math.floor(Math.random() * GUEST_NAMES.length)];
      const num = Math.floor(1000 + Math.random() * 9000);
      // Last attempts fall back to a timestamp suffix that cannot collide twice
      const username = attempt < 8 ? `${base}_${num}` : `${base}_${Date.now().toString(36)}`;
      try {
        user = await new User({ username, isGuest: true }).save();
      } catch (err) {
        if (err.code !== 11000) throw err; // 11000 = duplicate username, retry
      }
    }
    if (!user) {
      return res.status(500).json({ error: 'Could not generate a guest identity. Please try again.' });
    }

    const token = jwt.sign(
      { userId: user._id, username: user.username, isGuest: true },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Guest session created',
      token,
      user: { id: user._id, username: user.username, isGuest: true }
    });
  } catch (error) {
    console.error('Guest login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Claim a guest account by adding email and password (optionally a new username)
app.post('/auth/claim', authLimiter, authenticateToken, [
  body('email').isEmail().withMessage('Please enter a valid email').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('username').optional({ values: 'falsy' }).isLength({ min: 3, max: 50 }).withMessage('Username must be 3-50 characters').trim().escape()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(e => e.msg).join(', ');
      return res.status(400).json({ error: errorMessages });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (!user.isGuest) {
      return res.status(400).json({ error: 'This account is already claimed' });
    }

    const { email, password, username } = req.body;
    const newUsername = username || user.username;

    const conflict = await User.findOne({
      _id: { $ne: user._id },
      $or: [{ email }, { username: newUsername }]
    });
    if (conflict) {
      const field = conflict.email === email ? 'email' : 'username';
      return res.status(400).json({ error: `That ${field} is already taken` });
    }

    user.username = newUsername;
    user.email = email;
    user.password = password; // hashed by the pre-save hook
    user.isGuest = false;
    await user.save();

    const token = jwt.sign(
      { userId: user._id, username: user.username, isGuest: false },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Account claimed successfully',
      token,
      user: { id: user._id, username: user.username, email: user.email, isGuest: false }
    });
  } catch (error) {
    console.error('Claim account error:', error);
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

// Streaming story endpoints - tokens arrive over SSE while the player watches
const sseHeaders = (res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();
};

app.post('/game/start-stream', aiLimiter, authenticateToken, async (req, res) => {
  try {
    const { genre = 'fantasy' } = req.body;
    const game = new Game({ userId: req.user.userId, currentStory: '', choices: [], genre, progress: 0 });
    await game.save();
    sseHeaders(res);
    const { story, choices, closed } = await streamStory(res, { choice: null, genre });
    game.currentStory = story;
    game.choices = choices;
    game.history = [{ text: story, choice: '' }];
    await game.save();
    if (!closed) {
      sse(res, { type: 'done', gameId: game._id, story, choices, progress: 0 });
      res.end();
    }
  } catch (error) {
    console.error('Start stream error:', error);
    if (!res.headersSent) res.status(500).json({ error: 'Failed to start game' });
    else res.end();
  }
});

app.post('/game/continue-stream', aiLimiter, authenticateToken, async (req, res) => {
  try {
    const { gameId, choice } = req.body;
    const game = await Game.findOne({ _id: gameId, userId: req.user.userId });
    if (!game) return res.status(404).json({ error: 'Game not found' });
    sseHeaders(res);
    const { story, choices, closed } = await streamStory(res, { choice, genre: game.genre });
    // record the branch taken from the previous passage, then the new one
    if (game.history.length) game.history[game.history.length - 1].choice = String(choice || '').slice(0, 120);
    else if (game.currentStory) game.history.push({ text: game.currentStory, choice: String(choice || '').slice(0, 120) });
    game.history.push({ text: story, choice: '' });
    game.currentStory = story;
    game.choices = choices;
    game.progress += 1;
    await game.save();
    if (!closed) {
      sse(res, { type: 'done', gameId: game._id, story, choices, progress: game.progress });
      res.end();
    }
  } catch (error) {
    console.error('Continue stream error:', error);
    if (!res.headersSent) res.status(500).json({ error: 'Failed to continue game' });
    else res.end();
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

initOg(app);
startSeasonJob();
startReminderJob();

const PORT = process.env.PORT || 3000;
const httpServer = createServer(app);
initMultiplayer(httpServer);
httpServer.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
