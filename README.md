# Typocalypse 🚀

A narrative typing game where your speed and choices forge a new adventure every time you play.

Master the keyboard by navigating a dynamic story that branches with every choice you type. This isn't just a game; it's a tool to help you boost your typing speed and accuracy in an engaging, story-driven environment.

## 🛠️ Tech Stack

- **Frontend**: React with TypeScript, Tailwind CSS
- **Backend**: Node.js with Express, Socket.IO, web-push, nodemailer
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
- **Game Progress**: Save and continue games; every passage and choice is kept so a finished run can be published
- **Responsive Design**: Works on desktop and mobile
- **Multiplayer Rooms**: 9 real-time game modes over Socket.IO
- **Streaming Stories**: the passage you type is written live, token by token (OpenRouter when a key is set, offline passage bank otherwise)
- **Training Lab**: weak-key keyboard heatmap, an AI typing coach with a rule-based fallback, and drills generated from your worst keys
- **Global Ladder**: weekly, seasonal, and all-time leaderboards of best clean runs (80%+ accuracy), with a friends-only view and per-mode tabs
- **Ghost Racing**: every finished passage is recorded keystroke for keystroke - race your past self or share a ghost link
- **Sound + Juice**: WebAudio synth effects and screen shake, mutable, with five unlockable sound packs
- **Daily Apocalypse**: one seeded passage for the whole world, one attempt, emoji share grid, public daily ladder at `/daily`
- **Streaks**: day streaks with drill-powered repair, at-risk warnings, guest-claim hooks, and push/email reminders
- **Ghost Challenge Links**: copy a link, recipients auto-guest straight into the race - no login wall; shared ghosts are pinned so links never die
- **Public Profiles**: `/u/:username` pages with level, titles, achievements, rating, followers, heatmap, and race buttons
- **Social Cards**: per-route Open Graph meta and rendered 1200x630 PNG cards for ghosts, profiles, and the daily
- **Campaign**: four zones and 24 nodes with text mutators and star ratings
- **Arcade**: Meteor Shower, Last Words (memory), and Radio Transmissions (dictation)
- **Practice**: monkeytype-style timed tests with a consistency score, and a code-typing mode - both work offline
- **Progression**: XP, levels, 48 achievements, and a locker of unlockable themes, carets, and sound packs
- **Seasons**: the ladder resets monthly; the top 10 get a permanent season title
- **Quick Match**: rated 1v1 duels with an Elo rating, tiers, and a rating ladder
- **Weekend Tournaments**: a scheduled Typo Royale bracket every Saturday 18:00 UTC
- **Friends**: follow typists, an activity feed, suggested players, and a friends ladder
- **Story Library**: publish finished stories and relay chronicles; others read, like, and type them
- **Settings**: themes, caret styles, fonts (including OpenDyslexic), text size, reduced motion, high contrast, keyboard layout emulation (Dvorak, Colemak, AZERTY, QWERTZ), sound pack and volume
- **PWA**: installable, offline app shell, results queued offline and synced when back online
- **Hardened**: required JWT secret, rate-limited auth/guest/AI routes, CORS allowlist, helmet

## 🕹️ Every mode

| Group | Mode | Route | How it plays |
|-------|------|-------|--------------|
| Story | Story Mode | `/genre-selection` | Type the AI-written passage as it streams, pick a branch, repeat. Publishable to the library. |
| Story | Campaign | `/campaign` | 4 zones x 6 nodes. Mutators: fog, storm, night, ransom, blur, vanish, timebomb, mirror. 1 star to finish, 2 for the accuracy target, 3 for the WPM target. Bosses carry two mutators. |
| Story | Story Library | `/library` | Browse New / Top / Most played, like, and "type this story" passage by passage. |
| Arcade | Meteor Shower | `/arcade/meteor` | Words fall on the bunker. First letter locks a target, Esc drops it. Combos up to x5, gold words, repair words, slow-mo words. Global high-score ladder. |
| Arcade | Last Words | `/arcade/memory` | A passage shows for ~1.2s per word, then vanishes. Type it from memory. Five escalating rounds, word-level diff scoring. |
| Arcade | Radio Transmissions | `/arcade/radio` | The browser speaks a line through static; you type what you heard. Two replays per line, operator ranks. |
| Practice | Timed Test | `/practice` | 15/30/60s or 25/50/100 words, punctuation and numbers toggles, per-second WPM chart, consistency score. Works offline. |
| Practice | Code Mode | `/practice/code` | Snippets in JavaScript, TypeScript, Python, SQL, Bash, Rust with auto-indent and exact symbols. |
| Practice | Training Lab | `/stats` | Heatmap, AI coach, weak-key drills. |
| Compete | Quick Match | `/quickmatch` | Rated best-of-3 duel against someone near your rating. Elo K=32, tiers from Scrap to Apocalypse. |
| Compete | Multiplayer Rooms | `/multiplayer` | Nine modes with a 5 letter room code (table below). |
| Compete | Weekend Tournament | `/tournaments` | Register all week, Saturday 18:00 UTC heats of up to 20 in Typo Royale, heat winners play a final. Champion gets the Weekend Champion achievement and the Royal theme. |
| Compete | Daily Apocalypse | `/daily` | One passage, one attempt, the whole world. |
| Compete | Global Ladder | `/leaderboard` | Week / Season / All time, Global / Friends, mode tabs. |
| Social | Friends | `/friends` | Feed of the people you follow, suggestions, search, friends ladder. |
| You | Progression | `/progress` | Level, XP bar, achievements grid, cosmetics locker, titles. |

## 🎮 Multiplayer

Create a room from the Multiplayer hub, share the 5 letter code, and friends join from the same screen. The host picks the mode and genre; everyone readies up and the host starts.

| Mode | Type | Players | How it plays |
|------|------|---------|--------------|
| Horde Night | Co-op | 1-4 | Zombie words advance on a shared barricade. Type a word to kill its zombie. Shop between waves, story beats every 3rd wave. |
| Story Sprint | PvP | 2-8 | 5 legs on the same passage. Each leg winner picks the story branch. |
| Typo Royale | PvP | 2-20 | Timed bursts, slowest survivor eliminated each round. Eliminated players bet on survivors. |
| Word War | PvP | 2-4 | Clear your word queue. 5 clean words in a row dumps junk words on an opponent. Overflow at 10 and you are out. |
| Boss Raid | Co-op | 1-5 | Sentences deal damage. Interrupt boss casts by typing the counter-spell or eat blur, mirror, and vanish curses. Enrage at 30 percent. |
| Relay Chronicles | Co-op | 2-6 | One story typed in turns with a baton-pass overlap. Branch votes weighted by accuracy. The finished chronicle can be published to the library. |
| The Corruptor | Social | 3-8 | One hidden saboteur with sticky-keys, timer-shrink, and fake-accuracy tools. Type, discuss, accuse. Three dooms and the corruptor wins. |
| Tug of Words | Teams | 2-10 | Combined live team WPM pulls the knot. Typos mute your pull, power words give burst yanks. Best of 3. |
| Duel | PvP | 2 | Best of three passages head to head. Rated only when matched from the Quick Match queue. |

Multiplayer runs on the same server (Socket.IO shares the Express port) and needs no extra setup. Run the smoke tests with the server running: `node client/test-mp.mjs`.

## ⬆️ Progression

Every recorded passage, daily, match, duel, arcade run, campaign clear, story, follow, and tournament goes through one engine (`server/progression.js`) that awards XP, checks 48 achievements, and unlocks cosmetics. Level L starts at `100 * (L-1)^2` XP. Any response that awarded something carries a `progression` object and the client toasts it.

Unlockables: 10 themes (Brutal, Midnight, Old Paper, Ember, Toxic, Bubblegum, Terminal, Arctic, Blood at 100 WPM, Royal for tournament champions), 6 caret styles, 5 sound packs. Season titles and achievement names can be equipped as a profile title.

Seasons are calendar months (Season 1 = September 2026). An hourly job awards titles for finished seasons.

## 🔧 Environment

| Variable | Required | Purpose |
|----------|----------|---------|
| `JWT_SECRET` | production | Token signing. The server refuses to start in production without it. |
| `MONGODB_URI` | yes | MongoDB connection string. |
| `OPENROUTER_API_KEY` | no | Live AI stories and coach; offline fallbacks otherwise. |
| `CORS_ORIGIN` | deployed clients | Comma-separated origin allowlist. |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | for push | Web push keys (`npx web-push generate-vapid-keys`). Without them a per-boot keypair is used and subscriptions die on restart. |
| `SMTP_URL` / `MAIL_FROM` | for email | Nodemailer connection URL and sender for streak reminder emails. Logged, not sent, when unset. |
| `TOURNAMENT_START_IN_MIN` | testing | Schedule a test tournament N minutes after boot (and another N minutes after each one ends) instead of Saturday 18:00 UTC. |
| `TOURNAMENT_JOIN_WINDOW_SEC` | no | Seconds entrants have to join their arena room (default 75). |
| `PORT` | no | Defaults to 3000. |

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
- `GET /games` - Get user's game history (each game carries its passage `history`)

### Progress
- `POST /stats/session` - Record a finished passage with per-key hit/miss stats. Contexts: solo, drill, multiplayer, ghost, test, code, campaign, radio, memory, library, duel, arcade, lesson. Optional `consistency`, `localHour`, `won`, `skipXp`.
- `GET /stats/me` - Aggregated stats, weak keys, and WPM history
- `GET /stats/drill` - A 25 word drill built from your weakest keys
- `POST /stats/coach` - Coaching text (OpenRouter when configured, rule engine otherwise)
- `GET /leaderboard?period=weekly|season|all&scope=global|friends&mode=all|story|test15|test30|test60|words25|words50|words100|code|campaign` - Best clean runs per player (public)
- `GET /users/:username/public` - Public typist profile
- `GET /daily` / `POST /daily/result` / `GET /daily/leaderboard` - Daily challenge (one attempt per day)
- `GET /og/:kind/:id.png` - Social card images
- `POST /ghosts` / `GET /ghosts/mine` / `GET /ghosts/:id` / `POST /ghosts/:id/pin` - Keystroke recordings for ghost races

### Progression and seasons
- `GET /progression/me` - Level, XP, achievements, locker, titles
- `POST /progression/equip` - `{ theme?, caret?, sound?, title? }` (locked items are rejected)
- `GET /progression/catalog` - Public cosmetics and achievement definitions
- `GET /seasons/current` - Season number, end time, my rank, last season's podium
- `GET /users/:username/level`

### Arcade and campaign
- `POST /arcade/score` - `{ game: 'meteor', score, wave, kills, durationMs }` keeps only your best; `GET /arcade/leaderboard?game=meteor`; `GET /arcade/me`; `GET /arcade/radio` - 10 dictation lines
- `GET /campaign` - Map with unlock state and stars; `GET /campaign/:nodeId` - node text (403 while locked); `POST /campaign/:nodeId/clear` - `{ wpm, accuracy, errors, durationMs }` returns stars and unlocks

### Social and library
- `POST` / `DELETE /social/follow/:username`; `GET /social/me`; `GET /social/suggested`; `GET /social/:username/followers|following`
- `GET /feed` (people you follow) and `GET /feed/global`
- `POST /stories` - `{ source: 'solo', gameId, title }` or `{ source: 'relay', title, genre, passages: [{ text, by, choice? }] }`; `GET /stories?sort=new|top|played&genre=&page=`; `GET /stories/mine`; `GET /stories/:id`; `POST /stories/:id/like`; `POST /stories/:id/play`; `DELETE /stories/:id`

### Competitive
- `GET /ratings/top`; `GET /ratings/me`
- `GET /tournaments/next`; `GET /tournaments`; `GET /tournaments/:slug`; `POST` / `DELETE /tournaments/:slug/register`
- Socket: `queue:join { genre? }`, `queue:leave`, `queue:status`, `queue:matched { code, opponent }`; duel engine events `duel:leg`, `duel:progress`, `duel:legend`; `tournament:start { slug, name, roomCode, stage, joinBy }`, `tournament:advance`, `tournament:cancelled`, `tournament:finished`

### Notifications
- `GET /push/key`; `POST` / `DELETE /push/subscribe`; `POST /push/test`; `GET` / `POST /notify/prefs` - `{ email?, push? }`

## 🧪 Testing without a local MongoDB

The server runs against any MongoDB URI. For local integration runs, `mongodb-memory-server` works well: start it, pass its URI as `MONGODB_URI`, set `JWT_SECRET`, and drive the REST and socket APIs (`POST /auth/guest` gives a token). `TOURNAMENT_START_IN_MIN=1` makes a tournament fire a minute after boot.

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

## 📧 Contact

Shreyansh Kushwaha - shreyanshkushwaha02@gmail.com
