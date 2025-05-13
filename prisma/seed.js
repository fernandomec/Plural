const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  try {
    // Tentar adicionar usando Prisma Client (upsert)
    const adminPassword = await bcrypt.hash('admin123', 10);
    const editorPassword = await bcrypt.hash('editor456', 10);

    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@example.com' },
      update: {},
      create: {
        email: 'admin@example.com',
        username: 'admin',
        password: adminPassword,
        role: 'ADMIN',
        name: 'Administrador',
      },
    });

    const editorUser = await prisma.user.upsert({
      where: { email: 'editor@example.com' },
      update: {},
      create: {
        email: 'editor@example.com',
        username: 'editor',
        password: editorPassword,
        role: 'EDITOR',
        name: 'Editor User',
      },
    });

    console.log({ adminUser, editorUser });
  } catch (errorPrisma) {
    console.error('Erro ao adicionar usuários com Prisma:', errorPrisma);
    console.log('Tentando adicionar usuários com SQL bruto...');
    await rawSql();
  } finally {
    await prisma.$disconnect();
  }
}

async function rawSql() {
  try {
    const adminPassword = await bcrypt.hash('admin123', 10);
    const editorPassword = await bcrypt.hash('editor456', 10);

    const resultAdmin = await prisma.$executeRaw`
      INSERT INTO "User" (email, username, password, role, name)
      VALUES ('admin@example.com', 'admin', ${adminPassword}, 'ADMIN', 'Administrador')
      ON CONFLICT (email) DO NOTHING;
    `;
    console.log({ resultAdmin });

    const resultEditor = await prisma.$executeRaw`
      INSERT INTO "User" (email, username, password, role, name)
      VALUES ('editor@example.com', 'editor', ${editorPassword}, 'EDITOR', 'Editor User')
      ON CONFLICT (email) DO NOTHING;
    `;
    console.log({ resultEditor });
  } catch (errorRawSql) {
    console.error('Erro ao adicionar usuários com SQL bruto:', errorRawSql);
  }
}

main();