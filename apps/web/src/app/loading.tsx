// Squelette affiché pendant le chargement des pages (effet « shimmer »).
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Chargement">
      <div className="sk-hero sk" />
      {[0, 1, 2].map((r) => (
        <div key={r} className="sk-row">
          <div className="sk sk-title" />
          <div className="sk-cards">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="sk sk-card" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
