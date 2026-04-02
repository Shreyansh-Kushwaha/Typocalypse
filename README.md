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
├── client/          # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── pages/
│   │   └── ...
├── server/          # Node.js backend
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
   - Copy `.env` file in server directory
   - Add your MongoDB URI
   - Add your OpenRouter API key
   - Set a secure JWT secret

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
- **Game Progress**: Save and continue games
- **Responsive Design**: Works on desktop and mobile

## 🔧 API Endpoints

### Authentication
- `POST /auth/signup` - User registration
- `POST /auth/login` - User login

### Game
- `POST /game/start` - Start a new game
- `POST /game/continue` - Continue game with choice
- `GET /games` - Get user's game history

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
