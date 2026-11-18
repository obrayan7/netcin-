import { db } from "@netcine/db";
import { requireAdmin } from "@/lib/auth";

export default async function Users() {
  await requireAdmin();
  const [count, users] = await Promise.all([
    db.viewer.count(),
    db.viewer.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      select: { id: true, email: true, name: true, createdAt: true, _count: { select: { myListItems: true, likes: true } } },
    }),
  ]);
  return (
    <>
      <h1>Membres ({count})</h1>
      <p className="meta">Comptes créés sur le site public. Les 200 derniers sont affichés.</p>
      <table className="table">
        <thead>
          <tr><th>Email</th><th>Nom</th><th>Inscrit le</th><th>Ma liste</th><th>J'aime</th></tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.email}</td>
              <td>{u.name || "—"}</td>
              <td>{u.createdAt.toLocaleDateString("fr-FR")}</td>
              <td>{u._count.myListItems}</td>
              <td>{u._count.likes}</td>
            </tr>
          ))}
          {users.length === 0 && <tr><td colSpan={5}>Aucun membre pour l'instant.</td></tr>}
        </tbody>
      </table>
    </>
  );
}
