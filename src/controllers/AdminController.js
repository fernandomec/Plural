const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = {
    async adminPage(req, res) {
        try {
            const empresas = await prisma.empresa.findMany();
            const categorias = await prisma.category.findMany({
                select: {
                    id: true,
                    name: true,
                    empresaId: true
                }
            });
            
            res.render('admin', { 
                user: req.user,
                empresas: empresas,
                categorias: categorias
            });
        } catch (error) {
            console.error(error);
            res.status(500).send('Erro ao carregar página de admin');
        }
    },

    async editorPage(req, res) {
        res.render('editor', { user: req.user });
    }
};
