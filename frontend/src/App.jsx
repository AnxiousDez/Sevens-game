import { useSocketEvents } from './hooks/useSocketEvents';
import { useGameStore } from './store/gameStore';
import HomeScreen from './components/lobby/HomeScreen';
import LobbyScreen from './components/lobby/LobbyScreen';
import GameScreen from './components/game/GameScreen';
import RoundEndScreen from './components/ui/RoundEndScreen';
import ResultsScreen from './components/ui/ResultsScreen';
import LandscapeGate from './components/ui/LandscapeGate';

export default function App() {
  useSocketEvents();

  const { screen, error, setError } = useGameStore();
  const useLandscape = screen !== 'results';

  return (
    <LandscapeGate active={useLandscape}>
      <div className="app">
        {error && (
          <div className="error-banner" onClick={() => setError(null)}>
            <span className="error-banner-text">⚠️ {error}</span>
            <span className="dismiss">✕</span>
          </div>
        )}

        {screen === 'home' && <HomeScreen />}
        {screen === 'lobby' && <LobbyScreen />}
        {(screen === 'game' || screen === 'round_end') && (
          <>
            <GameScreen />
            {screen === 'round_end' && <RoundEndScreen />}
          </>
        )}
        {screen === 'results' && <ResultsScreen />}
      </div>
    </LandscapeGate>
  );
}
