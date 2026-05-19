import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const ALLOWED_USERNAMES = ["Irina", "Mike"];

async function main() {
  console.log("Seeding allowed usernames...");

  for (const username of ALLOWED_USERNAMES) {
    await prisma.allowedUsername.upsert({
      where: { username },
      update: {},
      create: { username },
    });
    console.log(`  ✓ ${username}`);
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
