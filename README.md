# Typocalypse 🚀

A narrative typing game where your speed and choices forge a new adventure every time you play.

Master the keyboard by navigating a dynamic story that branches with every choice you type. This isn't just a game; it's a tool to help you boost your typing speed and accuracy in an engaging, story-driven environment.

## 🛠️ Tech Stack

- **Frontend**: React with TypeScript, Tailwind CSS
- **Backend**: Node.js with Express
- **Database**: MongoDB Atlas
- **Authentication**: JWT-based
- **AI**: OpenRouter API for story generation

## 📁 Project Structure

```
Typocalypse/
├── client/      
│   ├── src/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── pages/
│   │   └── ...
├── server/     
│   ├── models/
│   ├── index.js
│   └── ...
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- OpenRouter API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Typocalypse
   ```

2. **Set up the backend**
   ```bash
   cd server
   npm install
   ```

3. **Configure environment variables**
   - Copy `server/.env.example` to `server/.env`
   - Set `JWT_SECRET` (required in production - the server refuses to start without it)
   - Add your MongoDB URI, optional OpenRouter API key, and `CORS_ORIGIN` for deployed clients

4. **Set up the frontend**
   ```bash
   cd ../client
   npm install
   ```

### Running the Application

1. **Start the backend server**
   ```bash
   cd server
   npm run dev
   ```
   Server will run on http://localhost:3000

2. **Start the frontend**
   ```bash
   cd client
   npm run dev
   ```
   Frontend will run on http://localhost:5173

3. **Open your browser**
   Navigate to http://localhost:5173

## 🎮 How to Play

1. **Sign up/Login** to create an account
2. **Choose a genre** from Fantasy, Horror, Sci-Fi, Mystery, Adventure, or Romance
3. **Type the story** as it appears on screen
4. **Make choices** to continue the branching narrative
5. **Improve your WPM** and accuracy with each game

## 📊 Features

- **Dynamic Storylines**: AI-generated stories that branch based on your choices
- **Real-time Typing Metrics**: WPM and accuracy tracking
- **Multiple Genres**: Choose from 6 different story genres
- **User Authentication**: Secure signup/login with JWT
- **Guest Mode**: Play instantly without an account, claim it later to keep your progress
- **Game Progress**: Save and continue games
- **Responsive Design**: Works on desktop and mobile
- **Multiplayer Rooms**: 8 real-time game modes over Socket.IO
- **Streaming Stories**: the passage you type is written live, token by token (OpenRouter when a key is set, offline passage bank otherwise)
- **Training Lab**: weak-key keyboard heatmap, an AI typing coach with a rule-based fallback, and drills generated from your worst keys
- **Global Ladder**: weekly and all-time leaderboards of best clean runs (80%+ accuracy)
- **Ghost Racing**: every finished passage is recorded keystroke for keystroke - race your past self or share a ghost link
- **Sound + Juice**: WebAudio synth effects and screen shake, mutable, no audio assets
- **Daily Apocalypse**: one seeded passage for the whole world, one attempt, emoji share grid, public daily ladder at `/daily`
- **Streaks**: day streaks with drill-powered repair, at-risk warnings, and guest-claim hooks
- **Ghost Challenge Links**: copy a link, recipients auto-guest straight into the race - no login wall; shared ghosts are pinned so links never die
- **Public Profiles**: `/u/:username` pages with stats, heatmap, and race buttons; the leaderboard is public
- **Social Cards**: per-route Open Graph meta and rendered 1200x630 PNG cards for ghosts, profiles, and the daily
- **Hardened**: required JWT secret, rate-limited auth/guest/AI routes, CORS allowlist, helmet

## 🎮 Multiplayer

Create a room from the dashboard (Multiplayer button), share the 5 letter code, and friends join from the same screen. The host picks the mode and genre; everyone readies up and the host starts.

| Mode | Type | Players | How it plays |
|------|------|---------|--------------|
| Horde Night | Co-op | 1-4 | Zombie words advance on a shared barricade. Type a word to kill its zombie. Shop between waves, story beats every 3rd wave. |
| Story Sprint | PvP | 2-8 | 5 legs on the same passage. Each leg winner picks the story branch. |
| Typo Royale | PvP | 2-20 | Timed bursts, slowest survivor eliminated each round. Eliminated players bet on survivors. |
| Word War | PvP | 2-4 | Clear your word queue. 5 clean words in a row dumps junk words on an opponent. Overflow at 10 and you are out. |
| Boss Raid | Co-op | 1-5 | Sentences deal damage. Interrupt boss casts by typing the counter-spell or eat blur, mirror, and vanish curses. Enrage at 30 percent. |
| Relay Chronicles | Co-op | 2-6 | One story typed in turns with a baton-pass overlap. Branch votes weighted by accuracy. The finished chronicle is shown at the end. |
| The Corruptor | Social | 3-8 | One hidden saboteur with sticky-keys, timer-shrink, and fake-accuracy tools. Type, discuss, accuse. Three dooms and the corruptor wins. |
| Tug of Words | Teams | 2-10 | Combined live team WPM pulls the knot. Typos mute your pull, power words give burst yanks. Best of 3. |

Multiplayer runs on the same server (Socket.IO shares the Express port) and needs no extra setup. Run the smoke tests with the server running: `node client/test-mp.mjs`.

## 🔧 API Endpoints

### Authentication
- `POST /auth/signup` - User registration
- `POST /auth/login` - User login
- `POST /auth/guest` - Create a guest session (auto-generated name like `Wanderer_4821`, no email or password)
- `POST /auth/claim` - Upgrade the current guest into a full account (email + password, optional new username); keeps all progress

Note for existing deployments: the email unique index is now sparse so guests can omit email. If your database was created before guest mode, drop the old index once: `db.users.dropIndex('email_1')` (it is recreated sparse on next server start).

### Game
- `POST /game/start` - Start a new game
- `POST /game/continue` - Continue game with choice
- `POST /game/start-stream` - Start a game with the story streamed over SSE
- `POST /game/continue-stream` - Continue with a choice, streamed over SSE
- `GET /games` - Get user's game history

### Progress
- `POST /stats/session` - Record a finished passage with per-key hit/miss stats
- `GET /stats/me` - Aggregated stats, weak keys, and WPM history
- `GET /stats/drill` - A 25 word drill built from your weakest keys
- `POST /stats/coach` - Coaching text (OpenRouter when configured, rule engine otherwise)
- `GET /leaderboard?period=weekly|all` - Best clean runs per player (public)
- `GET /users/:username/public` - Public typist profile
- `GET /daily` / `POST /daily/result` / `GET /daily/leaderboard` - Daily challenge (one attempt per day)
- `GET /og/:kind/:id.png` - Social card images
- `POST /ghosts` / `GET /ghosts/mine` / `GET /ghosts/:id` - Save, list, and fetch keystroke recordings for ghost races

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- OpenRouter for AI story generation
- Tailwind CSS for styling
- React for the frontend framework

## 🚀 Getting Started

To get a local copy up and running, follow these simple steps.

### Installation

1.  Clone the repository:
    ```sh
    git clone https://github.com/Shreyansh-Kushwaha/Typocalypse.git
    ```
2.  Navigate to the project directory:
    ```sh
    cd Typocalypse
    ```
3.  Install NPM packages:
    ```sh
    npm install
    ```
4.  Start the server:
    ```sh
    node index.js
    ```

The application will be running on `http://localhost:3000`.

---

## 🎮 How to Play

1.  Open the game in your browser.
2.  A paragraph of a story will appear on the screen.
3.  Start typing the text exactly as you see it. The game will highlight your progress and any errors.
4.  Once you successfully type the entire paragraph, two choices will be presented.
5.  Click on the choice you prefer to continue the story.
6.  A new paragraph will appear based on your decision. Keep typing to see where your adventure leads!

---

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".

1.  Fork the Project
2.  Create your Feature Branch 
3.  Commit your Changes
4.  Push to the Branch
5.  Open a Pull Request

Don't forget to give the project a star! Thanks again!

---


## 📧 Contact

Shreyansh Kushwaha - shreyanshkushwaha02@gmail.com
