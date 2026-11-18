import { db } from "@netcine/db";
import { requireAdmin } from "@/lib/auth";
import TitleForm from "../TitleForm";

export default async function NewTitle() {
  await requireAdmin();
  const categories = await db.category.findMany({ orderBy: { order: "asc" } });
  return (
    <>
      <h1>Nouveau titre</h1>
      <TitleForm categories={categories} />
    </>
  );
}
