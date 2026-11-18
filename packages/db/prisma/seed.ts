import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) throw new Error("ADMIN_EMAIL et ADMIN_PASSWORD sont requis");

  const passwordHash = await bcrypt.hash(password, 12);
  await db.adminUser.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, passwordHash },
  });

  if ((await db.category.count()) === 0) {
    const names = ["Nouveautés", "Films populaires", "Séries à la une"];
    for (const [i, name] of names.entries()) {
      await db.category.create({ data: { name, order: i } });
    }
  }
  console.log("Seed OK — admin :", email);
}

main().finally(() => db.$disconnect());
