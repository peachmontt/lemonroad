import { getHallOfShameCards } from '../game/runHistory';

export function HallOfShameTab() {
  const cards = getHallOfShameCards();

  return (
    <div className="lemon-club-tab-panel">
      <p className="lemon-club-tagline">Not everyone wins. Some people become content.</p>
      {cards.map((card) => (
        <div key={card.id} className="lemon-club-card lemon-club-shame-card">
          <h4>{card.title}</h4>
          <p className="lemon-club-shame-value">{card.value}</p>
          <p className="lemon-club-muted">{card.description}</p>
        </div>
      ))}
      <a href="/hall-of-shame" className="footer-link lemon-club-shame-link">
        Full Hall of Shame page →
      </a>
    </div>
  );
}
