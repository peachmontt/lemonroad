import { getHallOfShameCards } from '../game/runHistory';

export function HallOfShamePage() {
  const cards = getHallOfShameCards();

  return (
    <div className="hall-of-shame-page">
      <header className="hall-of-shame-header">
        <h1>Hall of Shame</h1>
        <p>Not everyone wins. Some people become content.</p>
        <a href="/" className="btn btn-secondary">
          Back to Lemon Road
        </a>
      </header>
      <main className="hall-of-shame-main">
        {cards.map((card) => (
          <article key={card.id} className="lemon-club-card lemon-club-shame-card">
            <h2>{card.title}</h2>
            <p className="lemon-club-shame-value">{card.value}</p>
            <p className="lemon-club-muted">{card.description}</p>
          </article>
        ))}
      </main>
    </div>
  );
}
