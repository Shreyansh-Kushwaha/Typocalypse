import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { SettingsProvider } from './contexts/SettingsContext.tsx';
import LandingPage from './pages/LandingPage.tsx';
import LoginPage from './pages/LoginPage.tsx';
import SignupPage from './pages/SignupPage.tsx';
import Dashboard from './pages/Dashboard.tsx';
import GamePage from './pages/GamePage.tsx';
import GenreSelection from './pages/GenreSelection.tsx';
import MultiplayerHub from './pages/MultiplayerHub.tsx';
import RoomPage from './pages/RoomPage.tsx';
import ClaimAccountPage from './pages/ClaimAccountPage.tsx';
import StatsPage from './pages/StatsPage.tsx';
import LeaderboardPage from './pages/LeaderboardPage.tsx';
import GhostRacePage from './pages/GhostRacePage.tsx';
import DailyPage from './pages/DailyPage.tsx';
import ProfilePage from './pages/ProfilePage.tsx';
import MeteorPage from './pages/MeteorPage.tsx';
import MemoryPage from './pages/MemoryPage.tsx';
import RadioPage from './pages/RadioPage.tsx';
import TimedTestPage from './pages/TimedTestPage.tsx';
import CodeModePage from './pages/CodeModePage.tsx';
import CampaignPage from './pages/CampaignPage.tsx';
import CampaignNodePage from './pages/CampaignNodePage.tsx';
import QuickMatchPage from './pages/QuickMatchPage.tsx';
import TournamentsPage from './pages/TournamentsPage.tsx';
import FriendsPage from './pages/FriendsPage.tsx';
import LibraryPage from './pages/LibraryPage.tsx';
import StoryPage from './pages/StoryPage.tsx';
import ProgressionPage from './pages/ProgressionPage.tsx';
import ProtectedRoute from './components/ProtectedRoute.tsx';
import GuestGateRoute from './components/GuestGateRoute.tsx';
import ProgressionToasts from './components/ProgressionToasts.tsx';
import SettingsFab from './components/SettingsFab.tsx';
import BackendWakeToast from './components/BackendWakeToast.tsx';
import { installProgressionWatcher } from './progression.ts';
import { installBackendWatcher } from './backend.ts';

installProgressionWatcher();
installBackendWatcher();

const P = ({ children }: { children: React.ReactNode }) => <ProtectedRoute>{children}</ProtectedRoute>;
const G = ({ children }: { children: React.ReactNode }) => <GuestGateRoute>{children}</GuestGateRoute>;

function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <Router>
          <div className="App">
            <ProgressionToasts />
            <BackendWakeToast />
            <SettingsFab />
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/dashboard" element={<P><Dashboard /></P>} />
              <Route path="/genre-selection" element={<P><GenreSelection /></P>} />
              <Route path="/game" element={<P><GamePage /></P>} />
              <Route path="/multiplayer" element={<P><MultiplayerHub /></P>} />
              <Route path="/room/:code" element={<P><RoomPage /></P>} />
              <Route path="/claim" element={<P><ClaimAccountPage /></P>} />
              <Route path="/stats" element={<P><StatsPage /></P>} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/u/:username" element={<ProfilePage />} />
              <Route path="/ghost/:id" element={<G><GhostRacePage /></G>} />
              <Route path="/daily" element={<G><DailyPage /></G>} />

              {/* arcade + practice - guests can jump straight in */}
              <Route path="/arcade/meteor" element={<G><MeteorPage /></G>} />
              <Route path="/arcade/memory" element={<G><MemoryPage /></G>} />
              <Route path="/arcade/radio" element={<G><RadioPage /></G>} />
              <Route path="/practice" element={<G><TimedTestPage /></G>} />
              <Route path="/practice/code" element={<G><CodeModePage /></G>} />
              <Route path="/campaign" element={<G><CampaignPage /></G>} />
              <Route path="/campaign/:nodeId" element={<G><CampaignNodePage /></G>} />

              {/* competitive + social */}
              <Route path="/quickmatch" element={<P><QuickMatchPage /></P>} />
              <Route path="/tournaments" element={<G><TournamentsPage /></G>} />
              <Route path="/friends" element={<P><FriendsPage /></P>} />
              <Route path="/library" element={<LibraryPage />} />
              <Route path="/library/:id" element={<G><StoryPage /></G>} />
              <Route path="/progress" element={<P><ProgressionPage /></P>} />
            </Routes>
          </div>
        </Router>
      </SettingsProvider>
    </AuthProvider>
  );
}

export default App;
