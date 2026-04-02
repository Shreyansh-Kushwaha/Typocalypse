import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/Button';
import Card from '../components/Card';

const LandingPage: React.FC = () => {
  const { user } = useAuth();

  const features = [
    {
      icon: '⚡',
      title: 'Fast & Adaptive',
      description: 'Real-time difficulty adjustment based on your performance',
    },
    {
      icon: '🎯',
      title: 'Focus Mode',
      description: 'Distraction-free typing experience for maximum productivity',
    },
    {
      icon: '🏆',
      title: 'Compete',
      description: 'Global leaderboard to showcase your typing prowess',
    },
    {
      icon: '📚',
      title: '7+ Genres',
      description: 'Fantasy, Horror, Mystery, Romance, Sci-Fi, Nature & more',
    },
    {
      icon: '🎨',
      title: 'Dark & Light',
      description: 'Themes optimized for comfort and readability',
    },
    {
      icon: '💾',
      title: 'Auto-Save',
      description: 'Your progress is saved automatically',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-slate-50 dark:from-slate-900 dark:via-indigo-950 dark:to-slate-900">
      {/* Animated Background Glows */}
      <div className="fixed top-0 right-0 w-96 h-96 bg-indigo-300/20 dark:bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-96 h-96 bg-green-300/20 dark:bg-green-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Hero Section */}
      <section className="relative z-10 min-h-screen flex items-center justify-center py-20 px-6">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          {/* Headline */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black leading-tight tracking-tight">
            <span className="bg-gradient-to-r from-indigo-600 via-slate-900 to-slate-900 dark:from-indigo-300 dark:via-slate-100 dark:to-slate-100 bg-clip-text text-transparent">
              Master Your Typing, Conquer Stories
            </span>
          </h1>

          {/* Subtext */}
          <p className="text-xl md:text-2xl text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed mx-auto">
            An immersive typing adventure where every word brings you closer to victory.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            {user ? (
              <Link to="/dashboard" className="w-full sm:w-auto">
                <Button size="lg" variant="primary" className="w-full sm:w-auto">
                  🎮 Go to Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/signup" className="w-full sm:w-auto">
                  <Button size="lg" variant="primary" className="w-full sm:w-auto">
                    🎮 Start Playing
                  </Button>
                </Link>
                <Link to="/login" className="w-full sm:w-auto">
                  <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                    📖 Login
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Demo/Preview Section */}
          <div className="mt-16 w-full max-w-2xl">
            <Card className="p-6 space-y-3">
              <div className="text-left space-y-3">
                <div className="text-slate-400 dark:text-slate-500 font-mono text-sm">
                  ▌ The ancient dragon landed softly on the mountain peaks...
                </div>
                <div className="text-green-600 dark:text-green-400 font-mono text-sm">
                  The ancient dragon landed softly on the mountain peaks
                </div>
              </div>
            </Card>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 text-center">
              WPM: 68 • Accuracy: 98% • Progress: 23/120 words
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 py-20 px-6 bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Why Typocalypse?
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              Everything you need for an immersive typing experience
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((feature, idx) => (
              <Card key={idx} variant="elevated" className="p-6 text-center space-y-3">
                <div className="text-4xl">{feature.icon}</div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {feature.title}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {feature.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-20 px-6">
        <div className="max-w-3xl mx-auto text-center space-y-6 bg-gradient-to-r from-indigo-500 to-green-500 rounded-2xl p-12 text-white shadow-xl">
          <h2 className="text-3xl md:text-4xl font-bold">
            Ready to type? Start your adventure now!
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {user ? (
              <Link to="/dashboard" className="w-full sm:w-auto">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto bg-white dark:bg-slate-100 text-indigo-600 hover:bg-slate-50">
                  Go to Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/signup" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto bg-white dark:bg-slate-100 text-indigo-600 hover:bg-slate-50">
                    Sign Up Free
                  </Button>
                </Link>
                <Button size="lg" variant="secondary" className="w-full sm:w-auto border-white text-white hover:bg-white/10">
                  Play Demo
                </Button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 py-8 px-6">
        <div className="max-w-5xl mx-auto text-center text-slate-600 dark:text-slate-400">
          <p>© 2026 Typocalypse. Master typing, craft stories, conquer challenges.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;