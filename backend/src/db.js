// Single shared Prisma client (database connection) for the whole app.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
module.exports = prisma;
