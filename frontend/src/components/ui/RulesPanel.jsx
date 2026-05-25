export default function RulesPanel({ onClose }) {
  return (
    <div className="rules-overlay" onClick={onClose}>
      <div className="rules-panel" onClick={e => e.stopPropagation()}>
        <div className="rules-header">
          <h2>How to Play Sevens</h2>
          <button type="button" className="rules-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="rules-body">
          <section className="rules-section">
            <h3>Goal</h3>
            <p>
              Be the first to empty your hand each round. Over the full match, keep your
              <strong> total score as low as possible</strong> — leftover cards in your hand add points.
            </p>
          </section>

          <section className="rules-section">
            <h3>Starting a round</h3>
            <ul>
              <li>3–7 players share a standard 52-card deck.</li>
              <li>The board starts empty. The <strong>first card played must be 7♠</strong>.</li>
              <li>After that, players take turns in seat order.</li>
            </ul>
          </section>

          <section className="rules-section">
            <h3>Valid moves</h3>
            <ul>
              <li>Each suit has its own row on the board.</li>
              <li>To <strong>open a new suit</strong>, play its <strong>7</strong>.</li>
              <li>On an open suit, play the next card up or down (e.g. 6 or 8 beside 7, then 5 or 9, and so on).</li>
              <li>You may only play <strong>one card per turn</strong>, and it must be a legal move.</li>
            </ul>
          </section>

          <section className="rules-section">
            <h3>No legal move?</h3>
            <p>
              If you have no valid card on your turn, you are <strong>skipped automatically</strong>.
              You do not draw new cards.
            </p>
          </section>

          <section className="rules-section">
            <h3>End of a round</h3>
            <ul>
              <li>The first player to play their last card <strong>wins the round</strong> and takes the round pot.</li>
              <li>Everyone else adds points equal to the cards still in their hand (Ace = 1, Jack = 11, Queen = 12, King = 13).</li>
            </ul>
          </section>

          <section className="rules-section">
            <h3>Match &amp; economy</h3>
            <ul>
              <li>A match has several rounds (host chooses; must be a multiple of player count).</li>
              <li>Before each round, every player pays a small <strong>entry fee</strong> from their session bankroll.</li>
              <li>Fees form the round pot — the round winner collects it.</li>
              <li>When the match ends, your round winnings become <strong>shop coins</strong> to buy card and table themes.</li>
              <li>The player with the <strong>lowest total score</strong> wins the match.</li>
            </ul>
          </section>

          <section className="rules-section">
            <h3>Controls &amp; tips</h3>
            <ul>
              <li>On your turn, tap a highlighted card to select it, then tap again (or press Play) to play it.</li>
              <li>Share the <strong>room code</strong> so friends can join the lobby.</li>
              <li>Disconnected? Rejoin with the same name and room code.</li>
              <li>New players can only join in the lobby — not after the match has started.</li>
            </ul>
          </section>
        </div>

        <div className="rules-footer">
          <button type="button" className="btn-primary" onClick={onClose}>Got it</button>
        </div>
      </div>
    </div>
  );
}
