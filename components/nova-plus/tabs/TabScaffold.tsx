import styles from "./TabScaffold.module.css";

export default function TabScaffold({
  eyebrow,
  title,
  description,
  cards,
}: {
  eyebrow: string;
  title: string;
  description: string;
  cards: Array<{ icon: string; title: string; text: string }>;
}) {
  return (
    <section className={styles.shell}>
      <header>
        <span>{eyebrow}</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </header>
      <div className={styles.grid}>
        {cards.map((card) => (
          <article key={card.title}>
            <i>{card.icon}</i>
            <strong>{card.title}</strong>
            <p>{card.text}</p>
          </article>
        ))}
      </div>
      <div className={styles.previewNote}>Admin preview · We will refine this tab next.</div>
    </section>
  );
}
