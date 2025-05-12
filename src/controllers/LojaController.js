const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = {
    async lojasPage(req, res) {
        try {
            const empresas = await prisma.empresa.findMany({
                include: {
                    bannerImagem: true,
                    products: {
                        include: {
                            images: true
                        }
                    }
                }
            });
            
            res.render('lojas', { 
                user: res.locals.user, 
                empresas: empresas 
            });
        } catch (error) {
            console.error('Erro ao carregar página de lojas:', error);
            res.status(500).render('404');
        }
    },

    async lojaById(req, res) {
        try {
            const empresa = await prisma.empresa.findUnique({
                where: { id: parseInt(req.params.id) },
                include: {
                    categorias: true,
                    products: {
                        include: {
                            images: true,
                            category: true
                        }
                    }
                }
            });

            if (!empresa) {
                return res.status(404).render('404');
            }

            res.render('lojasId', { 
                user: res.locals.user,
                empresa: empresa,
                products: empresa.products 
            });
        } catch (error) {
            console.error('Erro ao carregar página da loja:', error);
            res.status(500).render('404');
        }
    },

    async productById(req, res) {
        try {
            const { lojaId, produtoId } = req.params;
            
            const produto = await prisma.product.findUnique({
                where: { 
                    id: parseInt(produtoId),
                    empresaId: parseInt(lojaId)
                },
                include: {
                    images: true,
                    category: true,
                    empresa: true
                }
            });

            if (!produto) {
                return res.status(404).render('404');
            }

            // Buscar produtos relacionados (mesma categoria)
            const produtosRelacionados = await prisma.product.findMany({
                where: {
                    categoryId: produto.categoryId,
                    id: { not: produto.id },
                    empresaId: parseInt(lojaId)
                },
                include: {
                    images: true
                },
                take: 4
            });

            res.render('produto', {
                user: res.locals.user,
                produto,
                produtosRelacionados
            });
        } catch (error) {
            console.error('Erro ao carregar página do produto:', error);
            res.status(500).render('404');
        }
    }
};
