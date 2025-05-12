const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function seed() {
  try {
    const hashedPassword = await bcrypt.hash('HFxX8.k%0W%Gs1[0_@Y}', 10);

    const user = await prisma.user.create({
      data: {
        nome: 'teste',
        email: 'admin@gmail.com',
        password: hashedPassword,
        role: 'ADMIN',
        username: 'admin'
      },
    });

    console.log('Usuário administrador criado:', user);
  } catch (error) {
    console.error('Erro ao criar usuário administrador:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seed();