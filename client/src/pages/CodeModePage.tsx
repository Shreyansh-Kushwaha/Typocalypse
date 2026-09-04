import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Panel, Btn, Tag } from '../multiplayer/ui';
import { sfx } from '../sound';
import { LANGUAGES, LANGUAGE_LABEL, getSnippet, randomSnippetIndex } from '../content/snippets';
import type { Language } from '../content/snippets';
import { recordSession } from '../offline/queue';
import { useCharStream } from '../practice/useCharStream';
import type { CharStreamResult } from '../practice/useCharStream';
import CodeBlock from '../practice/CodeBlock';
import WpmChart from '../practice/WpmChart';
import LadderPanel from '../practice/LadderPanel';
import PracticeShell from '../practice/PracticeShell';
import { useOnline } from '../practice/useOnline';
import { localHour } from '../practice/stats';

const SETTINGS_KEY = 'typo-practice-code';

function loadLanguage(): Language {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    const p = raw ? JSON.parse(raw) : null;
    return p && (LANGUAGES as readonly string[]).includes(p.language) ? p.language : 'javascript';
  } catch {
    return 'javascript';
  }
}

type SaveState = 'idle' | 'saving' | 'saved' | 'queued' | 'failed';

const CodeModePage: React.FC = () => {
  const navigate = useNavigate();
  const { online, queued } = useOnline();
  const [language, setLanguage] = useState<Language>(loadLanguage);
  const [index, setIndex] = useState(() => randomSnippetIndex(loadLanguage()));
  const [save, setSave] = useState<SaveState>('idle');
  const [ladderKey, setLadderKey] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const target = getSnippet(language, index);

  useEffect(() => {
    document.title = 'Code Mode — Typocalypse';
    return () => { document.title = 'Typocalypse — survive the typing apocalypse'; };
  }, []);

  useEffect(() => {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ language })); } catch { /* storage unavailable */ }
  }, [language]);

  const onFinish = useCallback((r: CharStreamResult) => {
    sfx.success();
    setSave('saving');
    recordSession({
      context: 'code',
      mode: language,
      wpm: r.wpm,
      accuracy: r.accuracy,
      errors: r.errors,
      totalTyped: r.keystrokes,
      durationMs: r.durationMs,
      consistency: r.consistency,
      keyStats: r.keyStats,
      localHour: localHour(),
    })
      .then(res => { setSave(res.queued ? 'queued' : 'saved'); if (!res.queued) setLadderKey(k => k + 1); })
      .catch(() => setSave('failed'));
  }, [language]);

  const t = useCharStream({ target, onFinish });
  const { restart } = t;

  const focusBox = () => requestAnimationFrame(() => boxRef.current?.focus());

  const nextSnippet = useCallback(() => {
    setSave('idle');
    setIndex(i => randomSnippetIndex(language, i));
    focusBox();
  }, [language]);

  const sameSnippet = useCallback(() => {
    setSave('idle');
    restart();
    focusBox();
  }, [restart]);

  const changeLanguage = (lang: Language) => {
    setSave('idle');
    setLanguage(lang);
    setIndex(randomSnippetIndex(lang));
    focusBox();
  };

  // keyboard-only flow: on the result panel Tab / Enter load the next snippet; Esc inside the box restarts;
  // a printable key anywhere else pulls focus back into the code box.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const inBox = !!boxRef.current && boxRef.current.contains(e.target as Node);
      const onButton = (e.target as HTMLElement | null)?.tagName === 'BUTTON';
      if (t.finished && (e.key === 'Tab' || (e.key === 'Enter' && !onButton))) { e.preventDefault(); nextSnippet(); return; }
      if (inBox) return;
      if (e.key === 'Tab') return;
      if (e.key === 'Escape') { e.preventDefault(); sameSnippet(); return; }
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && !t.finished) boxRef.current?.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [t.finished, nextSnippet, sameSnippet]);

  const r = t.result;
  const lineCount = target.split('\n').length;

  return (
    <PracticeShell title="Code" accent="Mode" onBack={() => navigate('/dashboard')} online={online} queued={queued}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-1">
          {LANGUAGES.map(l => (
            <Btn
              key={l}
              tabIndex={-1}
              color={language === l ? 'bg-purple-300' : 'bg-white'}
              className={`text-xs py-1 px-3 ${language === l ? '' : 'opacity-70'}`}
              onClick={() => changeLanguage(l)}
              aria-pressed={language === l}
            >
              {LANGUAGE_LABEL[l]}
            </Btn>
          ))}
        </div>

        <p className="font-mono text-xs font-bold uppercase text-gray-600 dark:text-yellow-400/70">
          How to: type the code exactly, Enter for a new line (indentation is skipped for you), backspace fixes the current line. Esc restarts, Tab is trapped.
        </p>

        <div className="flex items-center gap-3 font-mono font-black text-2xl" style={{ fontVariantNumeric: 'tabular-nums' }}>
          <span>{t.secondsElapsed}s</span>
          <Tag>{lineCount} lines</Tag>
          {t.started && !t.finished && <Tag className="bg-yellow-300 dark:bg-transparent animate-pulse">live</Tag>}
          {!t.started && <Tag>ready</Tag>}
          {t.errors > 0 && !t.finished && <Tag className="bg-pink-300 dark:bg-transparent">{t.errors} err</Tag>}
        </div>

        {!r && (
          <CodeBlock
            target={t.target}
            typed={t.typed}
            auto={t.auto}
            pos={t.pos}
            started={t.started}
            finished={t.finished}
            onKeyDown={t.handleKey}
            shakeOn={t.errors}
            boxRef={boxRef}
          />
        )}

        {r && (
          <Panel className="space-y-4">
            <div className="flex flex-wrap items-end gap-6">
              <div>
                <p className="font-black uppercase text-xs tracking-widest">WPM</p>
                <p className="font-mono font-black text-7xl md:text-8xl leading-none" style={{ fontVariantNumeric: 'tabular-nums' }}>{r.wpm}</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 font-mono" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {[
                  ['accuracy', `${r.accuracy}%`],
                  ['errors', `${r.errors}`],
                  ['time', `${(r.durationMs / 1000).toFixed(1)}s`],
                  ['chars', `${r.keystrokes}`],
                ].map(([k, v]) => (
                  <div key={k}>
                    <p className="font-black uppercase text-[10px] tracking-widest text-gray-600 dark:text-yellow-400/70">{k}</p>
                    <p className="font-black text-2xl">{v}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <Tag className="bg-purple-300 dark:bg-transparent">{LANGUAGE_LABEL[language]}</Tag>
              <Tag>{lineCount} lines</Tag>
              <Tag>consistency {r.consistency}%</Tag>
            </div>

            {r.samples.length > 1 && <WpmChart samples={r.samples} />}

            <div className="flex flex-wrap items-center gap-3">
              <Btn color="bg-cyan-300" onClick={nextSnippet} autoFocus>Next snippet</Btn>
              <Btn color="bg-white" onClick={sameSnippet}>Same snippet</Btn>
              <span className="font-mono text-xs font-bold uppercase text-gray-600 dark:text-yellow-400/70">Tab or Enter for the next one</span>
              <span className="font-mono text-xs font-bold uppercase ml-auto">
                {save === 'saving' && 'saving…'}
                {save === 'saved' && 'saved to your history'}
                {save === 'queued' && 'saved offline — will sync'}
                {save === 'failed' && <span className="text-red-600 dark:text-red-400">could not save</span>}
              </span>
            </div>
          </Panel>
        )}

        <LadderPanel mode="code" title="Code ladder · all languages" online={online} refreshKey={ladderKey} />
      </div>
    </PracticeShell>
  );
};

export default CodeModePage;
