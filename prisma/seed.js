const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { users: usersData } = require('./users');

const prisma = new PrismaClient();

async function main() {
  for (let userData of usersData) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    await prisma.user.create({
      data: {
        name: userData.name,
        email: userData.email,
        password: hashedPassword,
        role: userData.role.toUpperCase(),
        username: userData.username,
      },
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

module.exports = main;