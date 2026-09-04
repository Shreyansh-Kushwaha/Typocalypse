import React from 'react';
import { Link } from 'react-router-dom';
import { SeoFor } from '../seo';
import { Panel, Tag, brutal } from '../multiplayer/ui';
import { useAuth } from '../contexts/AuthContext';

// The real privacy policy. Every claim here is checked against the code:
// server/models/*.js for what is stored, server/routes/*.js for what is
// public, server/story.js + server/routes/progress.js for OpenRouter,
// server/notify.js for push, and client/src/**/localStorage for the device.
// If any of those change, change this page.

const LAST_UPDATED = '4 September 2026';
const CONTACT = 'shreyanshkushwaha02@gmail.com';

const SECTIONS: { id: string; title: string }[] = [
  { id: 'who', title: 'Who runs this' },
  { id: 'stored', title: 'What is stored' },
  { id: 'public', title: 'What is public' },
  { id: 'device', title: 'On your device' },
  { id: 'third-parties', title: 'Third parties' },
  { id: 'children', title: 'Children' },
  { id: 'control', title: 'Your control' },
  { id: 'retention', title: 'How long it is kept' },
  { id: 'security', title: 'Security' },
  { id: 'changes', title: 'Changes' },
];

const H: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => (
  <h2
    id={id}
    className="text-xl sm:text-2xl font-black uppercase tracking-tight scroll-mt-24 border-b-4 border-black dark:border-yellow-400 pb-2 mb-4"
  >
    {children}
  </h2>
);

const P: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <p className={`text-base leading-relaxed break-words ${className}`}>{children}</p>
);

const UL: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ul className="space-y-2 text-base leading-relaxed list-disc pl-5 marker:text-[#ff007f]">{children}</ul>
);

const Term: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="font-black uppercase">{children}</span>
);

const Mail: React.FC = () => (
  <a
    href={`mailto:${CONTACT}`}
    className="underline decoration-2 underline-offset-2 font-mono font-bold break-all hover:bg-[#ff007f] hover:text-white focus:outline-none focus-visible:ring-4 focus-visible:ring-[#ff007f]"
  >
    {CONTACT}
  </a>
);

const PrivacyPage: React.FC = () => {
  const { user } = useAuth();

  const tocLinks = (
    <ol className="space-y-1.5 font-mono text-sm font-bold">
      {SECTIONS.map((s, i) => (
        <li key={s.id}>
          <a
            href={`#${s.id}`}
            className="flex items-center min-h-[40px] px-1 hover:bg-black hover:text-white dark:hover:bg-yellow-400 dark:hover:text-black focus:outline-none focus-visible:ring-4 focus-visible:ring-[#ff007f]"
          >
            <span className="opacity-60 mr-2">{String(i + 1).padStart(2, '0')}</span>
            {s.title}
          </a>
        </li>
      ))}
    </ol>
  );

  return (
    <div className="min-h-screen bg-[#f4f4f0] dark:bg-black text-black dark:text-yellow-400 font-sans selection:bg-black selection:text-white dark:selection:bg-yellow-400 dark:selection:text-black overflow-x-hidden pb-16">
      <SeoFor path="/privacy" />

      <header className="sticky top-0 z-40 bg-[#f4f4f0] dark:bg-black border-b-4 border-black dark:border-yellow-400">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex flex-wrap items-center justify-between gap-3">
          <Link to="/" className="text-xl sm:text-2xl font-black uppercase tracking-tighter">
            Typo<span className="bg-black text-white dark:bg-yellow-400 dark:text-black px-1">calypse</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link to="/">
              <span className="font-black uppercase text-xs sm:text-sm border-2 border-black dark:border-yellow-400 px-3 min-h-[40px] inline-flex items-center bg-cyan-300 dark:bg-black">
                ← Home
              </span>
            </Link>
            <Link to={user ? '/dashboard' : '/signup'}>
              <span className="font-black uppercase text-xs sm:text-sm border-2 border-black dark:border-yellow-400 px-3 min-h-[40px] inline-flex items-center bg-yellow-300 dark:bg-black">
                {user ? 'Dashboard' : 'Sign up'}
              </span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="max-w-3xl space-y-3 mb-8">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none">
            Privacy policy
          </h1>
          <div className="flex flex-wrap gap-2">
            <Tag className="bg-yellow-300 dark:bg-black">Last updated {LAST_UPDATED}</Tag>
            <Tag className="bg-green-300 dark:bg-black">No ads, no trackers</Tag>
          </div>
          <P>
            Typocalypse is a typing game. This page says exactly what it stores about you, why, who else
            ever sees it, and how to get rid of it. It is written to be read, not to be survived.
          </P>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[15rem_1fr] gap-6 lg:gap-10">
          {/* table of contents: collapsed on mobile, sticky on desktop */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <details className="lg:hidden border-4 border-black dark:border-yellow-400 bg-white dark:bg-black p-3">
              <summary className="font-black uppercase text-sm cursor-pointer min-h-[40px] flex items-center">Contents</summary>
              <nav aria-label="Sections" className="mt-3">{tocLinks}</nav>
            </details>
            <nav aria-label="Sections" className={`hidden lg:block bg-white dark:bg-black ${brutal.border} ${brutal.shadowSm} p-4`}>
              <p className="font-black uppercase text-sm mb-3">Contents</p>
              {tocLinks}
            </nav>
          </div>

          <div className="max-w-3xl space-y-6">
            {/* ------------------------------------------------------ who */}
            <Panel className="p-4 sm:p-6 space-y-4">
              <H id="who">1. Who runs this</H>
              <P>
                Typocalypse is a personal project, not a company. It is built and run by Shreyansh
                Kushwaha. If you have a question about your data, or you want it deleted, write to{' '}
                <Mail />. That is the only contact address, and a human reads it.
              </P>
              <P>
                The game runs in your browser and talks to one server that this project controls. There is
                no ad network, no analytics product, and no data broker anywhere in the stack.
              </P>
            </Panel>

            {/* --------------------------------------------------- stored */}
            <Panel className="p-4 sm:p-6 space-y-4">
              <H id="stored">2. What is stored, and why</H>
              <P>
                Almost everything below exists for one reason: so your progress survives a page refresh
                and so a leaderboard can be honest. Here is the whole list.
              </P>
              <UL>
                <li>
                  <Term>Your account.</Term> A username, an email address, and a password. The password is
                  never stored as you typed it — it is hashed with bcrypt, so nobody, including us, can
                  read it back.
                </li>
                <li>
                  <Term>Or a guest account.</Term> If you play without signing up, the server mints a guest
                  account with an auto-generated name like <span className="font-mono font-bold">Drifter_4210</span>.
                  It has no email and no password. It is still a real row in the database, and it still
                  appears on public leaderboards.
                </li>
                <li>
                  <Term>Typing sessions.</Term> Every finished passage saves the words per minute, accuracy,
                  error count, characters typed, how long it took, a consistency score on timed tests, and a
                  per-key tally of how many times each character was hit correctly or missed. That last one
                  is what draws the weak-key heatmap and picks your drills. The passage text itself is not
                  stored with the session.
                </li>
                <li>
                  <Term>Ghost recordings.</Term> When you save a ghost, the server keeps the passage text
                  plus a millisecond timestamp for every character you typed. That is what lets someone
                  replay the run keystroke by keystroke. Ghosts are shareable by link, and anyone with the
                  link can race them without signing in.
                </li>
                <li>
                  <Term>Daily results.</Term> One result per player per daily challenge: speed, accuracy,
                  errors, duration. It powers the daily ladder and your streak.
                </li>
                <li>
                  <Term>Multiplayer match results.</Term> The room code, the mode, and each player's final
                  numbers. In-room <Term>chat is not stored</Term> — messages are relayed live over the
                  socket to the people in the room and then they are gone.
                </li>
                <li>
                  <Term>Progression.</Term> XP, level, unlocked achievements, equipped cosmetics (theme,
                  caret, sound pack, title), your current and longest daily streak, your duel rating and
                  win/loss record, and any season titles you earn.
                </li>
                <li>
                  <Term>Social graph and feed.</Term> Who you follow, and activity entries such as a
                  personal best, an achievement, a level-up, a published story, or a match win.
                </li>
                <li>
                  <Term>Published stories.</Term> If you publish a run to the library, its title, genre,
                  passages, your author name, and its like and play counts are stored. Publishing is
                  something you choose to do; nothing is published automatically.
                </li>
                <li>
                  <Term>Push subscriptions.</Term> Only if you turn notifications on. The browser gives us
                  an endpoint URL and two encryption keys, and we store those plus your browser's user
                  agent string, so the streak reminder can be delivered to that device.
                </li>
                <li>
                  <Term>Arcade scores.</Term> One personal best per arcade game, with a little metadata
                  such as the wave you reached.
                </li>
              </UL>
              <P>
                We do not store your IP address in the database. The hosting provider and the rate limiter
                see it in transit, which is unavoidable for anything on the internet.
              </P>
            </Panel>

            {/* --------------------------------------------------- public */}
            <Panel className="p-4 sm:p-6 space-y-4">
              <H id="public">3. What other people can see</H>
              <P>
                Typocalypse is a competitive game, so some of it is public on purpose. Anyone on the
                internet, signed in or not, can see:
              </P>
              <UL>
                <li>Your username, and your profile page at <span className="font-mono font-bold break-all">/u/your-name</span>.</li>
                <li>Your level, XP, unlocked achievements, equipped title, and your best clean WPM.</li>
                <li>Your current daily streak, your duel rating, and any season titles.</li>
                <li>Your entries on the global ladder, the daily ladder, and the arcade high score table.</li>
                <li>Your keyboard heatmap, your weakest keys, and your recent session history, on your profile page.</li>
                <li>Any ghost you have saved or shared, including the passage and the keystroke timings.</li>
                <li>Any story you publish to the library, under your author name.</li>
                <li>Who you follow and who follows you, and your activity feed entries.</li>
              </UL>
              <P>
                Guest names are public too. A guest account is anonymous in the sense that it has no email
                attached, but <Term>Drifter_4210</Term> will still show up on the leaderboard, and if you
                tell people that name they can find your profile.
              </P>
              <P>
                Your email address is <Term>never</Term> shown to anyone. It is used only to log you in and,
                if you switch it on, to send a streak reminder.
              </P>
            </Panel>

            {/* --------------------------------------------------- device */}
            <Panel className="p-4 sm:p-6 space-y-4">
              <H id="device">4. What stays on your device</H>
              <P>
                The game keeps a few things in your browser's local storage. They never leave your device
                except where noted:
              </P>
              <UL>
                <li>Your login token and a copy of your username, so you stay signed in.</li>
                <li>Your settings: theme, caret style, keyboard layout, sound pack, volume and mute, and the timed-test and code-mode options you last picked.</li>
                <li>An offline queue. If a result cannot reach the server, it is parked here and sent when you are back online.</li>
                <li>Your local arcade high score, so the number is there before the server answers.</li>
              </UL>
              <P>
                There are <Term>no advertising cookies</Term>, no analytics cookies, and no third-party
                trackers. Clearing your browser storage signs you out and forgets your settings; it does not
                delete your account.
              </P>
            </Panel>

            {/* -------------------------------------------- third parties */}
            <Panel className="p-4 sm:p-6 space-y-4">
              <H id="third-parties">5. Who else touches your data</H>
              <UL>
                <li>
                  <Term>Render</Term> hosts the server. Like any host, it processes the traffic between your
                  browser and the game.
                </li>
                <li>
                  <Term>MongoDB Atlas</Term> stores the database described above.
                </li>
                <li>
                  <Term>OpenRouter</Term> generates AI story passages and coaching tips. When a story is
                  written or a tip is requested, the prompt and the branch text you chose are sent to
                  OpenRouter's models. Your account identity — username, email, user id — is not sent with
                  it.
                </li>
                <li>
                  <Term>Your browser's push service</Term> (Google, Mozilla, Apple or Microsoft, depending
                  on your browser) delivers notifications, but only while you have them switched on. The
                  notification text is encrypted for your device.
                </li>
                <li>
                  <Term>An email provider</Term>, only if you opt into email streak reminders, and only to
                  deliver that message.
                </li>
              </UL>
              <P>
                Radio Transmissions mode reads the passage aloud using the speech synthesiser built into
                your own browser. Nothing is recorded and nothing is sent anywhere for it. The game never
                asks for your microphone or your camera.
              </P>
              <P>Your data is not sold, rented, or shared for advertising. There is nobody to sell it to.</P>
            </Panel>

            {/* ------------------------------------------------- children */}
            <Panel className="p-4 sm:p-6 space-y-4">
              <H id="children">6. Children</H>
              <P>
                Typocalypse is not directed at children under 13, and accounts should not be created by
                them. We do not knowingly collect data from anyone under 13. If you believe a child has
                made an account, email <Mail /> and it will be deleted.
              </P>
            </Panel>

            {/* -------------------------------------------------- control */}
            <Panel className="p-4 sm:p-6 space-y-4">
              <H id="control">7. Your rights and your controls</H>
              <UL>
                <li>
                  <Term>Play without an email.</Term> Hit play as a guest and you never hand over an email
                  address or a password. You can claim the account later if you change your mind.
                </li>
                <li>
                  <Term>Delete your stories.</Term> Open a story you published and hit Delete. It is removed
                  from the library for everyone, immediately.
                </li>
                <li>
                  <Term>Unfollow.</Term> Following is a one-way edge you can remove at any time from a
                  profile page.
                </li>
                <li>
                  <Term>Turn notifications off.</Term> Settings → Notifications turns push and email
                  reminders off. Turning push off deletes the stored subscription for that device.
                </li>
                <li>
                  <Term>Get a copy, or get it deleted.</Term> Email <Mail /> from the address on the
                  account and ask. Account deletion removes your user record, sessions, ghosts, daily
                  results, arcade scores, follows and push subscriptions. Stories you published are deleted
                  too unless you ask for them to stay, in which case the author name is anonymised.
                </li>
              </UL>
              <P>
                Deleting an account is permanent. Leaderboard rows for a deleted account disappear with it;
                we do not keep a shadow copy to preserve rankings.
              </P>
            </Panel>

            {/* ------------------------------------------------ retention */}
            <Panel className="p-4 sm:p-6 space-y-4">
              <H id="retention">8. How long things are kept</H>
              <UL>
                <li>
                  <Term>Typing sessions</Term> are kept for as long as your account exists — the heatmap and
                  the coach need history to be worth anything.
                </li>
                <li>
                  <Term>Ghosts</Term> are pruned automatically: only your ten newest survive. A ghost you
                  shared is pinned, and pinned ghosts are never pruned, so a link you sent someone keeps
                  working.
                </li>
                <li>
                  <Term>Activity feed entries</Term> are kept indefinitely; they are the record of what
                  happened.
                </li>
                <li>
                  <Term>Daily results, match results, published stories and arcade bests</Term> are kept
                  while the account exists.
                </li>
                <li>
                  <Term>Push subscriptions</Term> are deleted as soon as the browser's push service reports
                  them dead, or when you turn notifications off.
                </li>
              </UL>
            </Panel>

            {/* ------------------------------------------------- security */}
            <Panel className="p-4 sm:p-6 space-y-4">
              <H id="security">9. Security</H>
              <UL>
                <li>Passwords are hashed with bcrypt at cost 12 and are never stored or logged in the clear.</li>
                <li>Sessions use a signed JWT that expires after seven days.</li>
                <li>Sign-up, log-in, guest creation and AI story requests are rate limited per address.</li>
                <li>The API only answers browser requests from an allowlist of origins.</li>
                <li>Standard security headers are set on every response.</li>
              </UL>
              <P>
                None of that makes any service perfectly secure, and anyone who tells you otherwise is
                selling something. Use a password you do not use anywhere else, and if you find a hole,
                email <Mail /> before you tell anyone else.
              </P>
            </Panel>

            {/* -------------------------------------------------- changes */}
            <Panel className="p-4 sm:p-6 space-y-4">
              <H id="changes">10. Changes to this policy</H>
              <P>
                If what the game stores changes, this page changes with it and the date at the top moves.
                There is no mailing list for policy updates, so the date is the honest signal — if it has
                not moved, nothing here has.
              </P>
              <P className="pt-2">
                Questions, deletion requests, or corrections to anything on this page: <Mail />.
              </P>
            </Panel>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link to="/" className="w-full sm:w-auto">
                <span className={`block text-center bg-cyan-300 dark:bg-black text-black dark:text-yellow-400 ${brutal.border} ${brutal.shadowSm} font-black uppercase px-6 py-3`}>
                  ← Back to Typocalypse
                </span>
              </Link>
              <Link to="/dashboard" className="w-full sm:w-auto">
                <span className={`block text-center bg-yellow-300 dark:bg-black text-black dark:text-yellow-400 ${brutal.border} ${brutal.shadowSm} font-black uppercase px-6 py-3`}>
                  Dashboard
                </span>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PrivacyPage;
