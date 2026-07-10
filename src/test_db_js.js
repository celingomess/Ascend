require("dotenv/config");
const { PrismaClient } = require("@prisma/client");
const { PrismaMariaDb } = require("@prisma/adapter-mariadb");

const databaseUrl = process.env.DATABASE_URL;
const adapter = new PrismaMariaDb(databaseUrl);
const p = new PrismaClient({ adapter });

p.users.findFirst()
  .then(user => {
    console.log("SUCCESS! User Sample:", user);
  })
  .catch(err => {
    console.error("FAILED!", err);
  })
  .finally(() => {
    p.$disconnect();
  });
