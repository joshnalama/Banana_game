import { useState } from 'react';
import ModePicker from './ModePicker.jsx';
import PuzzleArena from './components/PuzzleArena.jsx';
import MatchIntro from './components/MatchIntro.jsx';
import MinionCenterpiece from './components/MinionCenterpiece.jsx';

export default function Game({ user, onScore }) {
  const [activeMode, setActiveMode] = useState(null);
  const [inCountdown, setInCountdown] = useState(false);

  const handlePickMode = (modeId) => {
    setActiveMode(modeId);
    setInCountdown(true);
  };

  if (activeMode) {
    if (inCountdown) {
      return (
        <MatchIntro
          onComplete={() => setInCountdown(false)}
          title="I'M READY!"
        />
      );
    }

    return (
      <PuzzleArena
        modeKey={activeMode}
        onExit={() => setActiveMode(null)}
        onScoreUpdate={onScore}
        userAvatar={user?.avatar || '🧽'}
      />
    );
  }

  return (
    <div className="single-player-hub">
      {/* Hero Interactive SpongeBob Centerpiece */}
      <MinionCenterpiece streak={user?.streak || 0} />

      {/* Mode Picker Selection Cards */}
      <ModePicker onPick={handlePickMode} />
    </div>
  );
}
