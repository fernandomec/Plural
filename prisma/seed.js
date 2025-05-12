const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
import { users } from './users';

const prisma = new PrismaClient();

async function main() {
  for (let user of users) {
    await prisma.user.create({
      data: user
    })
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});

module.exports = main;