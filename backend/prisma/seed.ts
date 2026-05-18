import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const ALLOWED_EMAILS = [
  "wife@example.com",
  "husband@example.com",
];

async function main() {
  console.log("Seeding allowed emails...");

  for (const email of ALLOWED_EMAILS) {
    await prisma.allowedEmail.upsert({
      where: { email },
      update: {},
      create: { email },
    });
    console.log(`  ✓ ${email}`);
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
