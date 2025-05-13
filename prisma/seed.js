const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  try {
    // Adicionar usuários (tentativa com Prisma)
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
      },
    });

    console.log({ adminUser, editorUser });

    // Adicionar empresa, categoria e produto
    const artlatexEmpresa = await prisma.empresa.upsert({
      where: { email: 'artlatex@example.com' },
      update: {},
      create: {
        razaoSocial: 'Artlatex',
        email: 'artlatex@example.com',
        password: await bcrypt.hash('artlatex123', 10), // Senha genérica para a empresa
        cnpj: '12345678900012', // CNPJ genérico
        telefone: '1199999999', // Telefone genérico
        sobre: 'Loja de artigos para festas', // Descrição genérica
      },
    });
    console.log({ artlatexEmpresa });

    const baloesCategoria = await prisma.category.upsert({
      where: {
        name_empresaId: {
          name: 'Balões de Látex',
          empresaId: artlatexEmpresa.id,
        },
      },
      update: {},
      create: {
        name: 'Balões de Látex',
        empresaId: artlatexEmpresa.id,
      },
    });
    console.log({ baloesCategoria });

    const balaoProduto = await prisma.product.upsert({
      where: {
        name_empresaId: {
          name: 'Balão Metalizado Coração Dourado 18',
          empresaId: artlatexEmpresa.id,
        },
      },
      update: {},
      create: {
        name: 'Balão Metalizado Coração Dourado 18',
        descricao: 'Balões Metalizados teste',
        preco: 15.00,
        estoque: 10,
        empresaId: artlatexEmpresa.id,
        categoryId: baloesCategoria.id,
        userId: adminUser.id, // Vinculando ao adminUser que criamos
      },
    });
    console.log({ balaoProduto });

  } catch (errorPrisma) {
    console.error('Erro ao adicionar usuários/empresa/categoria/produto com Prisma:', errorPrisma);
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
    const empresaPassword = await bcrypt.hash('artlatex123', 10);

    await prisma.$executeRaw`
      INSERT INTO "User" (email, username, password, role)
      VALUES ('admin@example.com', 'admin', ${adminPassword}, 'ADMIN')
      ON CONFLICT (email) DO NOTHING;
    `;

    await prisma.$executeRaw`
      INSERT INTO "User" (email, username, password, role)
      VALUES ('editor@example.com', 'editor', ${editorPassword}, 'EDITOR')
      ON CONFLICT (email) DO NOTHING;
    `;

    await prisma.$executeRaw`
      INSERT INTO "Empresa" (razaoSocial, email, password, cnpj, telefone, sobre)
      VALUES ('Artlatex', 'artlatex@example.com', ${empresaPassword}, '12345678900012', '1199999999', 'Loja de artigos para festas')
      ON CONFLICT (email) DO NOTHING;
    `;

    const artlatexEmpresaResult = await prisma.$queryRaw`SELECT id FROM "Empresa" WHERE email = 'artlatex@example.com'`;
    const artlatexEmpresaId = artlatexEmpresaResult[0]?.id;

    if (artlatexEmpresaId) {
      await prisma.$executeRaw`
        INSERT INTO "Category" (name, "empresaId")
        VALUES ('Balões de Látex', ${artlatexEmpresaId})
        ON CONFLICT (name, "empresaId") DO NOTHING;
      `;

      const baloesCategoriaResult = await prisma.$queryRaw`SELECT id FROM "Category" WHERE name = 'Balões de Látex' AND "empresaId" = ${artlatexEmpresaId}`;
      const baloesCategoriaId = baloesCategoriaResult[0]?.id;

      const adminUserResult = await prisma.$queryRaw`SELECT id FROM "User" WHERE email = 'admin@example.com'`;
      const adminUserId = adminUserResult[0]?.id;

      if (baloesCategoriaId && adminUserId) {
        await prisma.$executeRaw`
          INSERT INTO "Product" (name, descricao, preco, estoque, "empresaId", "categoryId", "userId")
          VALUES ('Balão Metalizado Coração Dourado 18', 'Balões Metalizados teste', 15.00, 10, ${artlatexEmpresaId}, ${baloesCategoriaId}, ${adminUserId})
          ON CONFLICT (name, "empresaId") DO NOTHING;
        `;
      }
    }
  } catch (errorRawSql) {
    console.error('Erro ao adicionar usuários/empresa/categoria/produto com SQL bruto:', errorRawSql);
  }
}

main();