import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/Button';
import Card from '../components/Card';
import Badge from '../components/Badge';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-slate-100 font-sans selection:bg-indigo-500/30">
      {/* Refined Background Glow */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 dark:bg-indigo-500/5 blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-500/10 dark:bg-purple-500/5 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/70 dark:bg-[#0B1120]/70 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/60">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20">
              T
            </div>
            <h1 className="text-xl font-bold tracking-tight">
              Typocalypse
            </h1>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                {user?.username || 'Diana'}
              </span>
            </div>
            <Button
              onClick={handleLogout}
              variant="tertiary"
              size="sm"
              className="text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-6xl mx-auto px-6 py-10 space-y-12">
        
        {/* Welcome Section */}
        <div className="space-y-1 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500">{user?.username || 'Diana'}</span> 👋
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-lg">
            Ready to continue your typing adventure?
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { label: 'Games Played', value: '0', sub: 'Start your first game today', icon: '🎮' },
            { label: 'Best WPM', value: '0', sub: 'Personal best record', icon: '⚡' },
            { label: 'Accuracy', value: '0%', sub: 'Overall typing accuracy', icon: '🎯' },
          ].map((stat, idx) => (
            <Card 
              key={idx} 
              className="relative p-6 overflow-hidden border border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-900/50 hover:border-indigo-500/30 dark:hover:border-indigo-500/30 transition-all duration-300 hover:-translate-y-1 group"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                    {stat.label}
                  </p>
                  <p className="text-4xl font-black text-slate-900 dark:text-white font-mono mt-3 tracking-tighter group-hover:text-indigo-500 transition-colors">
                    {stat.value}
                  </p>
                </div>
                <div className="text-2xl opacity-40 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300">
                  {stat.icon}
                </div>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-500 mt-4 font-medium">
                {stat.sub}
              </p>
            </Card>
          ))}
        </div>

        {/* Start Game CTA - Redesigned */}
        <Card className="relative overflow-hidden border-0 shadow-2xl shadow-indigo-500/10 group">
          {/* Subtle elegant gradient instead of harsh green */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-700 to-slate-900 opacity-90" />
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay" />
          
          <div className="relative p-10 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8 text-white">
            <div className="space-y-3 text-center md:text-left">
              <h3 className="text-3xl font-bold tracking-tight">Ready for a new challenge?</h3>
              <p className="text-indigo-100/80 text-lg max-w-lg">
                Select a genre, warm up your fingers, and immerse yourself in your next typing adventure.
              </p>
            </div>
            <Link to="/genre-selection" className="shrink-0">
              <Button
                size="lg"
                className="bg-white text-indigo-900 hover:bg-slate-50 hover:scale-105 active:scale-95 transition-all duration-200 font-bold px-8 py-4 shadow-xl shadow-black/20"
              >
                <span className="flex items-center gap-2">
                  🎮 Start New Game
                </span>
              </Button>
            </Link>
          </div>
        </Card>

        {/* Recent Games Section */}
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold tracking-tight">
              Recent Games
            </h3>
            <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-none">
              None yet
            </Badge>
          </div>
          <Card className="p-10 text-center space-y-5 border-2 border-dashed border-slate-200 dark:border-slate-800 bg-transparent shadow-none flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center text-2xl mb-2">
              ⌨️
            </div>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Your match history is looking a little empty. Jump in and set your first record!
            </p>
            <Link to="/genre-selection">
              <Button variant="primary" className="bg-slate-900 dark:bg-white dark:text-slate-900 hover:opacity-90 transition-opacity">
                Play Your First Game
              </Button>
            </Link>
          </Card>
        </div>

        {/* Achievements Section */}
        <div className="space-y-5 pb-10">
          <h3 className="text-xl font-bold tracking-tight">
            Achievements
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: '🎮', label: 'First Game' },
              { icon: '⚡', label: 'Speed Demon' },
              { icon: '🎯', label: 'Accuracy Master' },
              { icon: '🏆', label: 'Champion' },
            ].map((achievement, idx) => (
              <Card 
                key={idx} 
                className="p-6 text-center space-y-3 border border-slate-200 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-800/20"
              >
                <div className="w-12 h-12 mx-auto rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-2xl grayscale opacity-50">
                  {achievement.icon}
                </div>
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-500">
                  {achievement.label}
                </p>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-200/50 dark:bg-slate-800/50 text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider">
                  <span>🔒</span> Locked
                </div>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;