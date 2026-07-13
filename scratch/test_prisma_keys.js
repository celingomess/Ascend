require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
console.log("Modelos carregados no PrismaClient:");
console.log(Object.keys(p).filter(k => !k.startsWith('_') && typeof p[k] === 'object' && p[k] !== null));
process.exit(0);
