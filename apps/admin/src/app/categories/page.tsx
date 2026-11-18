import { db } from "@netcine/db";
import { requireAdmin } from "@/lib/auth";
import { deleteCategory, saveCategory } from "../actions";

export default async function Categories() {
  await requireAdmin();
  const cats = await db.category.findMany({ orderBy: { order: "asc" }, include: { _count: { select: { titles: true } } } });
  return (
    <>
      <h1>Rangées de l'accueil</h1>
      <p>L'ordre (petit nombre = plus haut) détermine l'affichage sur la page d'accueil.</p>

      {cats.map((c) => (
        <div key={c.id} className="inline-form">
          <form action={saveCategory} className="inline-form">
            <input type="hidden" name="id" value={c.id} />
            <input name="name" defaultValue={c.name} required />
            <input name="order" type="number" defaultValue={c.order} style={{ width: 80 }} />
            <button className="btn ghost">Enregistrer</button>
            <span>{c._count.titles} titre(s)</span>
          </form>
          <form action={deleteCategory.bind(null, c.id)}>
            <button className="btn danger">Supprimer</button>
          </form>
        </div>
      ))}

      <h2>Nouvelle rangée</h2>
      <form action={saveCategory} className="inline-form">
        <input name="name" placeholder="Nom (ex : Thrillers)" required />
        <input name="order" type="number" defaultValue={cats.length} style={{ width: 80 }} />
        <button className="btn">Ajouter</button>
      </form>
    </>
  );
}
