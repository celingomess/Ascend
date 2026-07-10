import { prisma } from "./lib/prisma";

async function main() {
  const user = await prisma.users.findFirst();
  console.log("Database connection successful. User sample:", user);
}

main()
  .catch((e) => {
    console.error("Database connection failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
