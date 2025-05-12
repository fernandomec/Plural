const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { users: usersData } = require('./users');

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando o seed...'); // Adicione este log
  try {
    for (let userData of usersData) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const user = await prisma.user.create({
        data: {
          name: userData.name,
          email: userData.email,
          password: hashedPassword,
          role: userData.role.toUpperCase(),
          username: userData.username,
        },
      });
      console.log('Usuário criado:', user); // Adicione este log
    }
    console.log('Seed concluído com sucesso!'); // Adicione este log
  } catch (error) {
    console.error('Erro durante o seed:', error); // Log do erro
  }
}

main()
  .catch((e) => {
    console.error('Erro global no seed:', e); // Log do erro global
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

module.exports = main;