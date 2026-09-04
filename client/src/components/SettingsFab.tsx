import React, { lazy, Suspense } from 'react';
import { useSettings } from '../contexts/SettingsContext';

const SettingsPanel = lazy(() => import('./SettingsPanel'));

// Fixed bottom-right gear that opens the settings drawer.
const SettingsFab: React.FC = () => {
  const { open, close, isOpen } = useSettings();
  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label="Open settings"
        title="Settings"
        className="fixed bottom-4 right-4 z-40 w-11 h-11 flex items-center justify-center text-xl bg-white dark:bg-black text-black dark:text-yellow-400 border-4 border-black dark:border-yellow-400 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#facc15] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#000] dark:hover:shadow-[2px_2px_0px_0px_#facc15] active:shadow-none dark:active:shadow-none transition-all"
      >
        ⚙
      </button>
      {isOpen && (
        <Suspense fallback={null}>
          <SettingsPanel onClose={close} />
        </Suspense>
      )}
    </>
  );
};

export default SettingsFab;
