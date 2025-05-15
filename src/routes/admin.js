const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs'); // Adicionando import do fs
const { PrismaClient, OrderStatus } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');
const { authenticate } = require('../middleware/auth');
const { checkRole } = require('../middleware/roles');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const type = file.fieldname === 'bannerImagem' ? 'empresas' : 'produtos';
        const uploadPath = path.join(__dirname, '../../public/uploads', type);
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const allowedExtensions = ['.png', '.jpg', '.jpeg', '.gif'];
        const fileExt = path.extname(file.originalname).toLowerCase();
        
        if (!allowedExtensions.includes(fileExt)) {
            return cb(new Error('Tipo de arquivo não permitido'));
        }
        
        cb(null, `${Date.now()}${fileExt}`);
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Rota principal do admin que renderiza o dashboard
router.get('/', authenticate, checkRole('ADMIN'), async (req, res) => {
    try {
        console.log('Loading dashboard data...');
        
        // Calcular o primeiro dia do mês atual
        const dataInicio = new Date();
        dataInicio.setDate(1);
        dataInicio.setHours(0, 0, 0, 0);
        
        // Calcular o último dia do mês atual
        const dataFim = new Date();
        dataFim.setHours(23, 59, 59, 999);
        
        console.log('Date range:', dataInicio, 'to', dataFim);
        
        // Consultar todos os pedidos - incluindo aqueles que têm status ENTREGUE
        const pedidos = await prisma.pedido.findMany({
            include: {
                orderItems: true,
                user: true,
                empresa: true
            }
        });
        
        console.log('Total pedidos found:', pedidos.length);
        
        // Calcular vendas totais do mês atual
        const pedidosMesAtual = pedidos.filter(pedido => {
            const pedidoDate = new Date(pedido.createdAt);
            return pedidoDate >= dataInicio && pedidoDate <= dataFim;
        });
        
        const totalVendasMesAtual = pedidosMesAtual.reduce((acc, pedido) => acc + pedido.totalAmount, 0);
        
        console.log('Pedidos no mês atual:', pedidosMesAtual.length);
        console.log('Total vendas mês atual:', totalVendasMesAtual);
        
        // Contagem de produtos vendidos no mês atual
        const produtosVendidosMesAtual = pedidosMesAtual.reduce((acc, pedido) => {
            return acc + pedido.orderItems.reduce((sum, item) => sum + item.quantity, 0);
        }, 0);
        
        console.log('Produtos vendidos mês atual:', produtosVendidosMesAtual);
        
        // Calcular o primeiro dia do mês anterior
        const dataInicioMesAnterior = new Date(dataInicio);
        dataInicioMesAnterior.setMonth(dataInicioMesAnterior.getMonth() - 1);
        
        // Calcular o último dia do mês anterior
        const dataFimMesAnterior = new Date(dataInicio);
        dataFimMesAnterior.setDate(0);
        dataFimMesAnterior.setHours(23, 59, 59, 999);
        
        // Calcular vendas totais do mês anterior
        const pedidosMesAnterior = pedidos.filter(pedido => {
            const pedidoDate = new Date(pedido.createdAt);
            return pedidoDate >= dataInicioMesAnterior && pedidoDate <= dataFimMesAnterior;
        });
        
        const totalVendasMesAnterior = pedidosMesAnterior.reduce((acc, pedido) => acc + pedido.totalAmount, 0);
        
        console.log('Pedidos no mês anterior:', pedidosMesAnterior.length);
        console.log('Total vendas mês anterior:', totalVendasMesAnterior);
        
        // Calcular crescimento
        let crescimento = 0;
        if (totalVendasMesAnterior > 0) {
            crescimento = Math.round(((totalVendasMesAtual - totalVendasMesAnterior) / totalVendasMesAnterior) * 100);
        } else if (totalVendasMesAtual > 0) {
            crescimento = 100; // Se não havia vendas no mês anterior, crescimento = 100%
        }
        
        console.log('Crescimento:', crescimento);
        
        // Contagem de usuários ativos
        const totalUsuarios = await prisma.user.count({
            where: {
                role: 'USER'
            }
        });
        
        console.log('Total usuários:', totalUsuarios);
        
        // Calcular vendas por empresa
        const empresas = await prisma.empresa.findMany();
        
        // Usar o array de pedidos para calcular vendas por empresa
        const vendasPorEmpresa = empresas.map(empresa => {
            const pedidosEmpresa = pedidosMesAtual.filter(pedido => pedido.empresaId === empresa.id);
            const totalVendas = pedidosEmpresa.reduce((acc, pedido) => acc + pedido.totalAmount, 0);
            const percentual = totalVendasMesAtual > 0 
                ? Math.round((totalVendas / totalVendasMesAtual) * 100) 
                : 0;
            
            return {
                id: empresa.id,
                nome: empresa.razaoSocial,
                totalVendas: totalVendas,
                percentual: percentual
            };
        }).sort((a, b) => b.totalVendas - a.totalVendas);
        
        console.log('Vendas por empresa calculadas');
        
        // Organizar dados de compras por cliente
        const clientes = await prisma.user.findMany({
            where: {
                role: 'USER',
                pedidos: {
                    some: {}
                }
            },
            include: {
                pedidos: {
                    include: {
                        empresa: true
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                }
            }
        });
        
        const comprasPorCliente = clientes.map(cliente => {
            const totalCompras = cliente.pedidos.reduce((sum, pedido) => sum + pedido.totalAmount, 0);
            const ultimoPedido = cliente.pedidos[0];
            
            // Agrupar compras por empresa
            const empresasMap = new Map();
            
            cliente.pedidos.forEach(pedido => {
                const { empresaId, empresa, totalAmount, createdAt } = pedido;
                
                if (!empresasMap.has(empresaId)) {
                    empresasMap.set(empresaId, {
                        empresaId,
                        empresaNome: empresa.razaoSocial,
                        total: 0,
                        ultimoPedido: null
                    });
                }
                
                const empresaInfo = empresasMap.get(empresaId);
                empresaInfo.total += totalAmount;
                
                if (!empresaInfo.ultimoPedido || new Date(createdAt) > new Date(empresaInfo.ultimoPedido)) {
                    empresaInfo.ultimoPedido = createdAt;
                }
            });
            
            const empresasArray = Array.from(empresasMap.values()).map(empresa => ({
                ...empresa,
                percentual: Math.round((empresa.total / totalCompras) * 100),
                ultimoPedidoFormatado: new Date(empresa.ultimoPedido).toLocaleDateString('pt-BR')
            }));
            
            return {
                clienteId: cliente.id,
                clienteNome: cliente.username,
                totalCompras,
                ultimoPedido: ultimoPedido ? new Date(ultimoPedido.createdAt).toLocaleDateString('pt-BR') : '',
                empresas: empresasArray
            };
        }).sort((a, b) => b.totalCompras - a.totalCompras);
        
        console.log('Compras por cliente calculadas');
        
        // Contagem de pedidos por status
        const pedidosPorStatus = {};
        Object.values(OrderStatus).forEach(status => {
            pedidosPorStatus[status] = 0;
        });
        
        pedidos.forEach(pedido => {
            if (pedido.status in pedidosPorStatus) {
                pedidosPorStatus[pedido.status]++;
            }
        });
        
        console.log('Pedidos por status:', pedidosPorStatus);
        
        res.render('admin', {
            user: req.user,
            pageContent: 'dashboard',
            totalVendas: totalVendasMesAtual,
            contagem: {
                produtos: produtosVendidosMesAtual
            },
            crescimento,
            totalUsuarios,
            vendasPorEmpresa,
            comprasPorCliente,
            pedidosPorStatus
        });
    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
        res.status(500).send('Erro ao carregar dashboard: ' + error.message);
    }
});

// Rota para a página de produtos
router.get('/produtos', authenticate, checkRole('ADMIN'), async (req, res) => {
    try {
        const produtos = await prisma.product.findMany({
            include: {
                empresa: true,
                category: true,
                images: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        
        const empresas = await prisma.empresa.findMany();
        const categorias = await prisma.category.findMany({
            include: {
                empresa: true
            }
        });
        
        res.render('admin', { 
            user: req.user,
            produtos,
            empresas,
            categorias,
            totalProdutos: produtos.length,
            pageContent: 'product' // Indica que deve incluir o partial de produtos
        });
    } catch (error) {
        console.error('Erro ao carregar página de produtos:', error);
        res.status(500).send('Erro ao carregar página de produtos: ' + error.message);
    }
});

// Rota para listar todas as empresas (visualização da página)
router.get('/empresas', authenticate, checkRole('ADMIN'), async (req, res) => {
    try {
        const filtroRazaoSocial = req.query.razaoSocial;
        const filtroCNPJ = req.query.cnpj;
        
        // Construir o objeto de filtro
        const where = {};
        
        if (filtroRazaoSocial) {
            where.razaoSocial = {
                contains: filtroRazaoSocial,
                mode: 'insensitive'
            };
        }
        
        if (filtroCNPJ) {
            where.cnpj = {
                contains: filtroCNPJ
            };
        }
        
        const empresas = await prisma.empresa.findMany({
            where,
            include: {
                bannerImagem: true,
                categorias: true,
                products: true,
                pedidos: true
            },
            orderBy: {
                razaoSocial: 'asc'
            }
        });
        
        res.render('admin', {
            user: req.user,
            empresas,
            totalEmpresas: empresas.length,
            pageContent: 'empresas'
        });
    } catch (error) {
        console.error('Erro ao carregar página de empresas:', error);
        res.status(500).send('Erro ao carregar página de empresas: ' + error.message);
    }
});

// Rota para API listar empresas (retorna JSON) - Precisamos mudar o caminho para evitar conflito
router.get('/api/empresas', authenticate, checkRole('ADMIN'), async (req, res) => {
    try {
        const empresas = await prisma.empresa.findMany();
        res.json(empresas);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

//criar empresa
router.post('/empresa', authenticate, checkRole('ADMIN'), upload.single('bannerImagem'), async (req, res) => {
    try {
        const { razaoSocial, email, password, cnpj, telefone, sobre } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);

        let imagemData = null;
        if (req.file) {
            imagemData = await prisma.imagem.create({
                data: {
                    filename: req.file.filename,
                    endereco: `/uploads/empresas/${req.file.filename}`
                }
            });
        }

        const empresa = await prisma.empresa.create({
            data: {
                razaoSocial,
                email,
                password: hashedPassword,
                cnpj,
                telefone,
                sobre,
                bannerId: imagemData?.id
            }
        });

        res.redirect('/admin');
    } catch (error) {
        console.error('Erro ao criar empresa:', error);
        res.status(500).json({ error: error.message });
    }
});

// Listar produtos
router.get('/produtos', authenticate, checkRole('ADMIN'), async (req, res) => {
    try {
        const produtos = await prisma.product.findMany({
            include: {
                empresa: true,
                category: true
            }
        });
        res.json(produtos);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Obter categorias por empresa
router.get('/categorias/:empresaId', authenticate, checkRole('ADMIN'), async (req, res) => {
    try {
        const categorias = await prisma.category.findMany({
            where: {
                empresaId: parseInt(req.params.empresaId)
            }
        });
        res.json(categorias);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Criar categoria
router.post('/categoria', authenticate, checkRole('ADMIN'), async (req, res) => {
    try {
        const { name, empresaId } = req.body;
        const categoria = await prisma.category.create({
            data: {
                name,
                empresaId: parseInt(empresaId)
            }
        });
        res.redirect('/admin');
    } catch (error) {
        console.error('Erro ao criar categoria:', error);
        res.status(500).json({ error: error.message });
    }
});

// Criar produto
router.post('/produto', authenticate, checkRole('ADMIN'), upload.single('produtoImagem'), async (req, res) => {
    try {
        const {
            name,
            categoryId,
            descricao,
            preco,
            boolPromo,
            desconto,
            estoque,
            codBarra,
            empresaId
        } = req.body;

        let imagemData = null;
        if (req.file) {
            imagemData = await prisma.imagem.create({
                data: {
                    filename: req.file.filename,
                    endereco: `/uploads/produtos/${req.file.filename}`
                }
            });
        }

        const produto = await prisma.product.create({
            data: {
                name,
                categoryId: parseInt(categoryId),
                descricao,
                preco: parseFloat(preco),
                boolPromo: boolPromo === 'on',
                desconto: desconto ? parseInt(desconto) : null,
                estoque: parseInt(estoque),
                codBarra,
                empresaId: parseInt(empresaId),
                userId: req.user.id,
                images: imagemData ? {
                    connect: { id: imagemData.id }
                } : undefined
            }
        });

        res.json({ success: true, message: 'Produto criado com sucesso!' });
    } catch (error) {
        console.error('Erro ao criar produto:', error);
        res.status(500).json({ error: error.message });
    }
});

// Adicione esta rota para fornecer dados dinâmicos para o dashboard
router.get('/dashboard-data', authenticate, checkRole('ADMIN'), async (req, res) => {
    try {
        const period = req.query.period || 'month'; // Padrão para mês
        
        // Definir a data de início com base no período
        let startDate;
        const now = new Date();
        
        switch (period) {
            case 'week':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
                break;
            case 'year':
                startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
                break;
            default:
                startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        }
        
        // Buscar pedidos no período
        const pedidos = await prisma.pedido.findMany({
            where: {
                status: {
                    notIn: ['CANCELADO']
                },
                createdAt: {
                    gte: startDate
                }
            },
            include: {
                empresa: true
            }
        });
        
        // Calcular vendas totais do período
        const totalVendas = pedidos.reduce((acc, pedido) => acc + pedido.totalAmount, 0);
        
        // Estatísticas por empresa
        const empresas = await prisma.empresa.findMany({
            include: {
                pedidos: {
                    where: {
                        status: {
                            notIn: ['CANCELADO']
                        },
                        createdAt: {
                            gte: startDate
                        }
                    }
                }
            }
        });

        // Calcular vendas por empresa no período
        const vendasPorEmpresa = empresas.map(empresa => {
            const totalEmpresa = empresa.pedidos.reduce((acc, pedido) => acc + pedido.totalAmount, 0);
            const percentual = totalVendas > 0 ? (totalEmpresa / totalVendas * 100).toFixed(2) : 0;
            
            return {
                id: empresa.id,
                nome: empresa.razaoSocial,
                totalVendas: totalEmpresa,
                percentual: parseFloat(percentual)
            };
        }).sort((a, b) => b.totalVendas - a.totalVendas);
        
        res.json({
            success: true,
            period,
            totalVendas,
            empresas: vendasPorEmpresa,
            produtosVendidos: await prisma.orderItem.count({
                where: {
                    pedido: {
                        createdAt: {
                            gte: startDate
                        }
                    }
                }
            })
        });
    } catch (error) {
        console.error('Erro ao buscar dados do dashboard:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao buscar dados do dashboard', 
            error: error.message 
        });
    }
});

// Rota para exibir o formulário de criação de produto
router.get('/produto/criar', authenticate, checkRole('ADMIN'), async (req, res) => {
    try {
        const empresas = await prisma.empresa.findMany();
        const categorias = await prisma.category.findMany({
            include: { empresa: true }
        });
        
        res.render('admin', { 
            user: req.user,
            empresas,
            categorias,
            pageContent: 'create-product',
            pageTitle: 'Criar Novo Produto'
        });
    } catch (error) {
        console.error('Erro ao carregar formulário de criação de produto:', error);
        res.status(500).send('Erro ao carregar formulário de criação de produto: ' + error.message);
    }
});

// Rota para exibir o formulário de edição de produto
router.get('/produto/editar/:id', authenticate, checkRole('ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        
        const produto = await prisma.product.findUnique({
            where: { id: parseInt(id) },
            include: {
                empresa: true,
                category: true,
                images: true
            }
        });
        
        if (!produto) {
            return res.status(404).send('Produto não encontrado');
        }
        
        const empresas = await prisma.empresa.findMany();
        
        const categorias = await prisma.category.findMany({
            where: { empresaId: produto.empresaId },
            include: { empresa: true }
        });
        
        res.render('admin', { 
            user: req.user,
            produto,
            empresas,
            categorias,
            pageContent: 'edit-product',
            pageTitle: 'Editar Produto'
        });
    } catch (error) {
        console.error('Erro ao carregar formulário de edição de produto:', error);
        res.status(500).send('Erro ao carregar formulário de edição de produto: ' + error.message);
    }
});

// Rota para processar a criação de produto (POST)
router.post('/produto', authenticate, checkRole('ADMIN'), upload.single('produtoImagem'), async (req, res) => {
    try {
        const {
            name,
            categoryId,
            descricao,
            preco,
            boolPromo,
            desconto,
            estoque,
            codBarra,
            empresaId
        } = req.body;

        // Validações básicas
        if (!name || !categoryId || !preco || !estoque || !empresaId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Campos obrigatórios não preenchidos'
            });
        }

        // Processar imagem, se houver
        let imagemData = null;
        if (req.file) {
            imagemData = await prisma.imagem.create({
                data: {
                    filename: req.file.filename,
                    endereco: `/uploads/produtos/${req.file.filename}`
                }
            });
        }

        // Criar produto
        const produto = await prisma.product.create({
            data: {
                name,
                categoryId: parseInt(categoryId),
                descricao,
                preco: parseFloat(preco),
                boolPromo: boolPromo === 'true' || boolPromo === 'on',
                desconto: desconto && (boolPromo === 'true' || boolPromo === 'on') ? parseInt(desconto) : null,
                estoque: parseInt(estoque),
                codBarra,
                empresaId: parseInt(empresaId),
                userId: req.user.id
            }
        });

        // Se houver imagem, associá-la ao produto
        if (imagemData) {
            await prisma.imagem.update({
                where: { id: imagemData.id },
                data: { productId: produto.id }
            });
        }

        res.status(201).json({ 
            success: true, 
            message: 'Produto criado com sucesso!',
            produto: produto
        });
    } catch (error) {
        console.error('Erro ao criar produto:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao criar produto', 
            error: error.message 
        });
    }
});

// Rota para processar a atualização de produto (PUT)
router.put('/produto/:id', authenticate, checkRole('ADMIN'), upload.single('produtoImagem'), async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            categoryId,
            descricao,
            preco,
            boolPromo,
            desconto,
            estoque,
            codBarra,
            empresaId
        } = req.body;

        // Validações básicas
        if (!name || !categoryId || !preco || !estoque || !empresaId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Campos obrigatórios não preenchidos'
            });
        }

        // Processar imagem, se houver
        let imagemData = null;
        if (req.file) {
            imagemData = await prisma.imagem.create({
                data: {
                    filename: req.file.filename,
                    endereco: `/uploads/produtos/${req.file.filename}`,
                    productId: parseInt(id)
                }
            });
        }

        // Atualizar produto
        const produto = await prisma.product.update({
            where: { id: parseInt(id) },
            data: {
                name,
                categoryId: parseInt(categoryId),
                descricao,
                preco: parseFloat(preco),
                boolPromo: boolPromo === 'true' || boolPromo === 'on',
                desconto: desconto && (boolPromo === 'true' || boolPromo === 'on') ? parseInt(desconto) : null,
                estoque: parseInt(estoque),
                codBarra,
                empresaId: parseInt(empresaId)
            }
        });

        res.status(200).json({ 
            success: true, 
            message: 'Produto atualizado com sucesso!',
            produto: produto
        });
    } catch (error) {
        console.error('Erro ao atualizar produto:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao atualizar produto', 
            error: error.message 
        });
    }
});

// Rota para excluir produto (DELETE)
router.delete('/produto/:id', authenticate, checkRole('ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verificar se o produto existe
        const produto = await prisma.product.findUnique({
            where: { id: parseInt(id) }
        });
        
        if (!produto) {
            return res.status(404).json({
                success: false,
                message: 'Produto não encontrado'
            });
        }
        
        // Excluir produto
        await prisma.product.delete({
            where: { id: parseInt(id) }
        });
        
        res.json({
            success: true,
            message: 'Produto excluído com sucesso!'
        });
    } catch (error) {
        console.error('Erro ao excluir produto:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao excluir produto',
            error: error.message
        });
    }
});

// Rota para listar todas as empresas
router.get('/empresas', authenticate, checkRole('ADMIN'), async (req, res) => {
    try {
        const filtroRazaoSocial = req.query.razaoSocial;
        const filtroCNPJ = req.query.cnpj;
        
        // Construir o objeto de filtro
        const where = {};
        
        if (filtroRazaoSocial) {
            where.razaoSocial = {
                contains: filtroRazaoSocial,
                mode: 'insensitive'
            };
        }
        
        if (filtroCNPJ) {
            where.cnpj = {
                contains: filtroCNPJ
            };
        }
        
        const empresas = await prisma.empresa.findMany({
            where,
            include: {
                bannerImagem: true,
                categorias: true,
                products: true,
                pedidos: true
            },
            orderBy: {
                razaoSocial: 'asc'
            }
        });
        
        res.render('admin', {
            user: req.user,
            empresas,
            totalEmpresas: empresas.length,
            pageContent: 'empresas'
        });
    } catch (error) {
        console.error('Erro ao carregar página de empresas:', error);
        res.status(500).send('Erro ao carregar página de empresas: ' + error.message);
    }
});

// Rota para exibir o formulário de criação de empresa
router.get('/empresa/criar', authenticate, checkRole('ADMIN'), async (req, res) => {
    try {
        res.render('admin', {
            user: req.user,
            pageContent: 'create-empresa',
            pageTitle: 'Criar Nova Empresa'
        });
    } catch (error) {
        console.error('Erro ao carregar formulário de criação de empresa:', error);
        res.status(500).send('Erro ao carregar formulário de criação de empresa: ' + error.message);
    }
});

// Rota para exibir o formulário de edição de empresa
router.get('/empresa/editar/:id', authenticate, checkRole('ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        
        const empresa = await prisma.empresa.findUnique({
            where: { id: parseInt(id) },
            include: {
                bannerImagem: true,
                categorias: true,
                products: true,
                pedidos: true
            }
        });
        
        if (!empresa) {
            return res.status(404).send('Empresa não encontrada');
        }
        
        res.render('admin', {
            user: req.user,
            empresa,
            pageContent: 'edit-empresa',
            pageTitle: 'Editar Empresa'
        });
    } catch (error) {
        console.error('Erro ao carregar formulário de edição de empresa:', error);
        res.status(500).send('Erro ao carregar formulário de edição de empresa: ' + error.message);
    }
});

// Rota para criar uma nova empresa
router.post('/empresa', authenticate, checkRole('ADMIN'), upload.single('bannerImagem'), async (req, res) => {
    try {
        const { razaoSocial, email, password, cnpj, telefone, sobre } = req.body;

        // Validações básicas
        if (!razaoSocial || !email || !password || !cnpj || !telefone || !sobre) {
            return res.status(400).json({
                success: false,
                message: 'Todos os campos obrigatórios devem ser preenchidos'
            });
        }

        // Verificar se já existe uma empresa com o mesmo CNPJ ou e-mail
        const empresaExistente = await prisma.empresa.findFirst({
            where: {
                OR: [
                    { cnpj },
                    { email }
                ]
            }
        });

        if (empresaExistente) {
            const campoExistente = empresaExistente.cnpj === cnpj ? 'CNPJ' : 'E-mail';
            return res.status(400).json({
                success: false,
                message: `${campoExistente} já cadastrado`
            });
        }

        // Hash da senha
        const hashedPassword = await bcrypt.hash(password, 10);

        // Processar imagem, se houver
        let bannerImagemId = null;
        if (req.file) {
            const imagem = await prisma.imagem.create({
                data: {
                    filename: req.file.filename,
                    endereco: `/uploads/empresas/${req.file.filename}`
                }
            });
            bannerImagemId = imagem.id;
        }

        // Criar a empresa
        const empresa = await prisma.empresa.create({
            data: {
                razaoSocial,
                email,
                password: hashedPassword,
                cnpj,
                telefone,
                sobre,
                bannerId: bannerImagemId
            }
        });

        res.status(201).json({
            success: true,
            message: 'Empresa criada com sucesso!',
            empresa
        });
    } catch (error) {
        console.error('Erro ao criar empresa:', error);
        // Verificar se é um erro de unique constraint no email
        if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
            return res.status(400).json({
                success: false,
                message: 'E-mail já cadastrado'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Erro ao criar empresa',
            error: error.message
        });
    }
});

// Rota para atualizar uma empresa
router.put('/empresa/:id', authenticate, checkRole('ADMIN'), upload.single('bannerImagem'), async (req, res) => {
    try {
        const { id } = req.params;
        const { razaoSocial, email, password, cnpj, telefone, sobre } = req.body;

        // Validações básicas
        if (!razaoSocial || !email || !cnpj || !telefone || !sobre) {
            return res.status(400).json({
                success: false,
                message: 'Todos os campos obrigatórios devem ser preenchidos'
            });
        }

        // Verificar se existe outra empresa com o mesmo CNPJ ou e-mail
        const empresaExistente = await prisma.empresa.findFirst({
            where: {
                OR: [
                    { cnpj, NOT: { id: parseInt(id) } },
                    { email, NOT: { id: parseInt(id) } }
                ]
            }
        });

        if (empresaExistente) {
            return res.status(400).json({
                success: false,
                message: empresaExistente.cnpj === cnpj ? 'CNPJ já cadastrado em outra empresa' : 'E-mail já cadastrado em outra empresa'
            });
        }

        // Preparar dados para atualização
        const updateData = {
            razaoSocial,
            email,
            cnpj,
            telefone,
            sobre
        };

        // Se houver nova senha, fazer hash e incluir nos dados de atualização
        if (password) {
            // Salvar a senha atual para histórico
            const empresaAtual = await prisma.empresa.findUnique({
                where: { id: parseInt(id) }
            });

            await prisma.pastPassword.create({
                data: {
                    password: empresaAtual.password,
                    empresaId: parseInt(id),
                    createdAt: new Date()
                }
            });

            // Hash da nova senha
            updateData.password = await bcrypt.hash(password, 10);
        }

        // Processar imagem, se houver
        if (req.file) {
            const imagem = await prisma.imagem.create({
                data: {
                    filename: req.file.filename,
                    endereco: `/uploads/empresas/${req.file.filename}`
                }
            });
            updateData.bannerId = imagem.id;
        }

        // Atualizar a empresa
        const empresa = await prisma.empresa.update({
            where: { id: parseInt(id) },
            data: updateData
        });

        res.status(200).json({
            success: true,
            message: 'Empresa atualizada com sucesso!',
            empresa
        });
    } catch (error) {
        console.error('Erro ao atualizar empresa:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao atualizar empresa',
            error: error.message
        });
    }
});

// Rota para excluir uma empresa
router.delete('/empresa/:id', authenticate, checkRole('ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verificar se a empresa existe
        const empresa = await prisma.empresa.findUnique({
            where: { id: parseInt(id) }
        });
        
        if (!empresa) {
            return res.status(404).json({
                success: false,
                message: 'Empresa não encontrada'
            });
        }
        
        // Excluir empresa (as relações serão excluídas em cascata conforme definido no schema)
        await prisma.empresa.delete({
            where: { id: parseInt(id) }
        });
        
        res.json({
            success: true,
            message: 'Empresa excluída com sucesso!'
        });
    } catch (error) {
        console.error('Erro ao excluir empresa:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao excluir empresa',
            error: error.message
        });
    }
});

// Rota para excluir imagem de empresa
router.delete('/empresa/imagem/:id', authenticate, checkRole('ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        
        // Buscar a imagem
        const imagem = await prisma.imagem.findUnique({
            where: { id: parseInt(id) }
        });
        
        if (!imagem) {
            return res.status(404).json({
                success: false,
                message: 'Imagem não encontrada'
            });
        }
        
        // Buscar empresa que usa esta imagem
        const empresa = await prisma.empresa.findFirst({
            where: { bannerId: parseInt(id) }
        });
        
        if (empresa) {
            // Remover referência da imagem na empresa
            await prisma.empresa.update({
                where: { id: empresa.id },
                data: { bannerId: null }
            });
        }
        
        // Excluir a imagem do banco de dados
        await prisma.imagem.delete({
            where: { id: parseInt(id) }
        });
        
        // Excluir o arquivo físico se existir
        if (imagem.filename) {
            const filePath = path.join(__dirname, '../../public', imagem.endereco);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
        
        res.json({
            success: true,
            message: 'Imagem removida com sucesso!'
        });
    } catch (error) {
        console.error('Erro ao excluir imagem:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao excluir imagem',
            error: error.message
        });
    }
});

// Rota para verificar se um email já está em uso
router.get('/check-email', authenticate, checkRole('ADMIN'), async (req, res) => {
    try {
        const { email } = req.query;
        
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'E-mail não fornecido'
            });
        }
        
        // Verificar se existe uma empresa com este email
        const empresaExistente = await prisma.empresa.findUnique({
            where: { email }
        });
        
        res.json({
            success: true,
            exists: !!empresaExistente
        });
    } catch (error) {
        console.error('Erro ao verificar email:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao verificar email',
            error: error.message
        });
    }
});

// Rota para a página de categorias
router.get('/categorias', authenticate, checkRole('ADMIN'), async (req, res) => {
    try {
        const filtroNome = req.query.nome;
        const filtroEmpresa = req.query.empresa;
        
        // Construir o objeto de filtro
        const where = {};
        
        if (filtroNome) {
            where.name = {
                contains: filtroNome,
                mode: 'insensitive'
            };
        }
        
        if (filtroEmpresa) {
            where.empresaId = parseInt(filtroEmpresa);
        }
        
        const categorias = await prisma.category.findMany({
            where,
            include: {
                empresa: true,
                products: true
            },
            orderBy: [
                { empresaId: 'asc' },
                { name: 'asc' }
            ]
        });
        
        const empresas = await prisma.empresa.findMany({
            orderBy: {
                razaoSocial: 'asc'
            }
        });
        
        res.render('admin', {
            user: req.user,
            categorias,
            empresas,
            totalCategorias: categorias.length,
            pageContent: 'categorias'
        });
    } catch (error) {
        console.error('Erro ao carregar página de categorias:', error);
        res.status(500).send('Erro ao carregar página de categorias: ' + error.message);
    }
});

// Rota para exibir o formulário de criação de categoria
router.get('/categoria/criar', authenticate, checkRole('ADMIN'), async (req, res) => {
    try {
        const empresas = await prisma.empresa.findMany({
            orderBy: {
                razaoSocial: 'asc'
            }
        });
        
        res.render('admin', {
            user: req.user,
            empresas,
            pageContent: 'create-category',
            pageTitle: 'Criar Nova Categoria'
        });
    } catch (error) {
        console.error('Erro ao carregar formulário de criação de categoria:', error);
        res.status(500).send('Erro ao carregar formulário de criação de categoria: ' + error.message);
    }
});

// Rota para exibir o formulário de edição de categoria
router.get('/categoria/editar/:id', authenticate, checkRole('ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        
        const categoria = await prisma.category.findUnique({
            where: { id: parseInt(id) },
            include: {
                empresa: true,
                products: true
            }
        });
        
        if (!categoria) {
            return res.status(404).send('Categoria não encontrada');
        }
        
        const empresas = await prisma.empresa.findMany({
            orderBy: {
                razaoSocial: 'asc'
            }
        });
        
        res.render('admin', {
            user: req.user,
            categoria,
            empresas,
            pageContent: 'edit-category',
            pageTitle: 'Editar Categoria'
        });
    } catch (error) {
        console.error('Erro ao carregar formulário de edição de categoria:', error);
        res.status(500).send('Erro ao carregar formulário de edição de categoria: ' + error.message);
    }
});

// Rota para criar uma nova categoria (API)
router.post('/categoria', authenticate, checkRole('ADMIN'), async (req, res) => {
    try {
        const { name, empresaId } = req.body;
        
        // Validações básicas
        if (!name || !empresaId) {
            return res.status(400).json({
                success: false,
                message: 'Nome e empresa são obrigatórios'
            });
        }
        
        // Verificar se já existe uma categoria com o mesmo nome na mesma empresa
        const categoriaExistente = await prisma.category.findFirst({
            where: {
                name,
                empresaId: parseInt(empresaId)
            }
        });
        
        if (categoriaExistente) {
            return res.status(400).json({
                success: false,
                message: 'Já existe uma categoria com este nome para esta empresa'
            });
        }
        
        // Criar categoria
        const categoria = await prisma.category.create({
            data: {
                name,
                empresaId: parseInt(empresaId)
            }
        });
        
        res.status(201).json({
            success: true,
            message: 'Categoria criada com sucesso!',
            categoria
        });
    } catch (error) {
        console.error('Erro ao criar categoria:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao criar categoria',
            error: error.message
        });
    }
});

// Rota para atualizar uma categoria (API)
router.put('/categoria/:id', authenticate, checkRole('ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, empresaId } = req.body;
        
        // Validações básicas
        if (!name || !empresaId) {
            return res.status(400).json({
                success: false,
                message: 'Nome e empresa são obrigatórios'
            });
        }
        
        // Verificar se já existe outra categoria com o mesmo nome na mesma empresa
        const categoriaExistente = await prisma.category.findFirst({
            where: {
                name,
                empresaId: parseInt(empresaId),
                NOT: {
                    id: parseInt(id)
                }
            }
        });
        
        if (categoriaExistente) {
            return res.status(400).json({
                success: false,
                message: 'Já existe outra categoria com este nome para esta empresa'
            });
        }
        
        // Atualizar categoria
        const categoria = await prisma.category.update({
            where: { id: parseInt(id) },
            data: {
                name,
                empresaId: parseInt(empresaId)
            }
        });
        
        res.json({
            success: true,
            message: 'Categoria atualizada com sucesso!',
            categoria
        });
    } catch (error) {
        console.error('Erro ao atualizar categoria:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao atualizar categoria',
            error: error.message
        });
    }
});

// Rota para excluir uma categoria (API)
router.delete('/categoria/:id', authenticate, checkRole('ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verificar se a categoria existe
        const categoria = await prisma.category.findUnique({
            where: { id: parseInt(id) },
            include: {
                products: true
            }
        });
        
        if (!categoria) {
            return res.status(404).json({
                success: false,
                message: 'Categoria não encontrada'
            });
        }
        
        // Excluir categoria (as relações serão excluídas em cascata conforme definido no schema)
        await prisma.category.delete({
            where: { id: parseInt(id) }
        });
        
        res.json({
            success: true,
            message: 'Categoria excluída com sucesso!'
        });
    } catch (error) {
        console.error('Erro ao excluir categoria:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao excluir categoria',
            error: error.message
        });
    }
});

// Rota para a página de usuários
router.get('/usuarios', authenticate, checkRole('ADMIN'), async (req, res) => {
    try {
        const filtroEmail = req.query.email;
        const filtroUsername = req.query.username;
        const filtroRole = req.query.role;
        
        // Construir o objeto de filtro
        const where = {};
        
        if (filtroEmail) {
            where.email = {
                contains: filtroEmail,
                mode: 'insensitive'
            };
        }
        
        if (filtroUsername) {
            where.username = {
                contains: filtroUsername,
                mode: 'insensitive'
            };
        }
        
        if (filtroRole) {
            where.role = filtroRole;
        }
        
        const usuarios = await prisma.user.findMany({
            where,
            include: {
                pedidos: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        
        res.render('admin', {
            user: req.user,
            usuarios,
            totalUsuarios: usuarios.length,
            pageContent: 'usuarios'
        });
    } catch (error) {
        console.error('Erro ao carregar página de usuários:', error);
        res.status(500).send('Erro ao carregar página de usuários: ' + error.message);
    }
});

// Rota para exibir o formulário de edição de usuário
router.get('/usuario/editar/:id', authenticate, checkRole('ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        
        const usuario = await prisma.user.findUnique({
            where: { id: parseInt(id) },
            include: {
                pedidos: {
                    orderBy: {
                        createdAt: 'desc'
                    }
                }
            }
        });
        
        if (!usuario) {
            return res.status(404).send('Usuário não encontrado');
        }
        
        res.render('admin', {
            user: req.user,
            usuario,
            pageContent: 'edit-user',  // Changed from 'edit-usuario' to 'edit-user'
            pageTitle: 'Editar Usuário'
        });
    } catch (error) {
        console.error('Erro ao carregar formulário de edição de usuário:', error);
        res.status(500).send('Erro ao carregar formulário de edição de usuário: ' + error.message);
    }
});

// Rota para atualizar usuário
router.put('/usuario/:id', authenticate, checkRole('ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        const { username, email, role, password, tel, cep, endereco, enderecoComplemento, bairro } = req.body;

        // Validações básicas
        if (!username || !email || !role) {
            return res.status(400).json({
                success: false,
                message: 'Nome de usuário, e-mail e função são obrigatórios'
            });
        }

        // Preparar dados para atualização
        const updateData = {
            username,
            email,
            role,
            tel,
            cep,
            endereco,
            enderecoComplemento,
            bairro
        };

        // Se houver nova senha, fazer hash e incluir nos dados de atualização
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            updateData.password = hashedPassword;
        }

        // Atualizar o usuário
        const usuario = await prisma.user.update({
            where: { id: parseInt(id) },
            data: updateData
        });

        res.status(200).json({
            success: true,
            message: 'Usuário atualizado com sucesso!',
            usuario
        });
    } catch (error) {
        console.error('Erro ao atualizar usuário:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao atualizar usuário',
            error: error.message
        });
    }
});

// Rota para excluir usuário
router.delete('/usuario/:id', authenticate, checkRole('ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verificar se o usuário existe
        const usuario = await prisma.user.findUnique({
            where: { id: parseInt(id) }
        });
        
        if (!usuario) {
            return res.status(404).json({
                success: false,
                message: 'Usuário não encontrado'
            });
        }
        
        // Impedir a exclusão do próprio usuário admin logado
        if (usuario.id === req.user.id) {
            return res.status(400).json({
                success: false,
                message: 'Você não pode excluir seu próprio usuário'
            });
        }
        
        // Excluir usuário (as relações serão tratadas pelo Prisma conforme configurado no schema)
        await prisma.user.delete({
            where: { id: parseInt(id) }
        });
        
        res.json({
            success: true,
            message: 'Usuário excluído com sucesso!'
        });
    } catch (error) {
        console.error('Erro ao excluir usuário:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao excluir usuário',
            error: error.message
        });
    }
});

// Rota para a página de pedidos
router.get('/pedidos', authenticate, checkRole('ADMIN'), async (req, res) => {
    try {
        const filtroEmpresa = req.query.empresa ? parseInt(req.query.empresa) : null;
        const filtroUsuario = req.query.usuario ? parseInt(req.query.usuario) : null;
        const filtroStatus = req.query.status;
        const filtroDataInicio = req.query.dataInicio;
        const filtroDataFim = req.query.dataFim;
        const filtroValorMinimo = req.query.valorMinimo ? parseFloat(req.query.valorMinimo) : null;
        
        // Construir o objeto de filtro
        const where = {};
        
        if (filtroEmpresa) {
            where.empresaId = filtroEmpresa;
        }
        
        if (filtroUsuario) {
            where.userId = filtroUsuario;
        }
        
        if (filtroStatus) {
            where.status = filtroStatus;
        }
        
        if (filtroDataInicio || filtroDataFim) {
            where.createdAt = {};
            
            if (filtroDataInicio) {
                where.createdAt.gte = new Date(filtroDataInicio);
            }
            
            if (filtroDataFim) {
                where.createdAt.lte = new Date(filtroDataFim);
                // Ajustar para fim do dia
                where.createdAt.lte.setHours(23, 59, 59, 999);
            }
        }
        
        if (filtroValorMinimo) {
            where.totalAmount = {
                gte: filtroValorMinimo
            };
        }
        
        const pedidos = await prisma.pedido.findMany({
            where,
            include: {
                user: true,
                empresa: true,
                orderItems: {
                    include: {
                        product: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        
        // Buscar empresas e usuários para filtros
        const empresas = await prisma.empresa.findMany({
            orderBy: {
                razaoSocial: 'asc'
            }
        });
        
        const usuarios = await prisma.user.findMany({
            orderBy: {
                username: 'asc'
            }
        });
        
        res.render('admin', {
            user: req.user,
            pedidos,
            empresas,
            usuarios,
            totalPedidos: pedidos.length,
            pageContent: 'pedidos',
            formatPedidoStatus: (status) => {
                const statusMap = {
                    'PEDIDO_RECEBIDO': 'Pedido Recebido',
                    'PAGAMENTO_APROVADO': 'Pagamento Aprovado',
                    'EM_SEPARACAO': 'Em Separação',
                    'ENVIADO_TRANSPORTADORA': 'Enviado à Transportadora',
                    'EM_TRANSPORTE': 'Em Transporte',
                    'EM_ROTA_DE_ENTREGA': 'Em Rota de Entrega',
                    'ENTREGUE': 'Entregue',
                    'TROCA_DEVOLUCAO_SOLICITADA': 'Devolução Solicitada',
                    'TROCA_DEVOLUCAO_CONCLUIDA': 'Devolução Concluída'
                };
                return statusMap[status] || status;
            }
        });
    } catch (error) {
        console.error('Erro ao carregar página de pedidos:', error);
        res.status(500).send('Erro ao carregar página de pedidos: ' + error.message);
    }
});

// Rota para exibir o formulário de edição de pedido
router.get('/pedido/editar/:id', authenticate, checkRole('ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        
        const pedido = await prisma.pedido.findUnique({
            where: { id: parseInt(id) },
            include: {
                user: true,
                empresa: true,
                orderItems: {
                    include: {
                        product: true
                    }
                }
            }
        });
        
        if (!pedido) {
            return res.status(404).send('Pedido não encontrado');
        }
        
        res.render('admin', {
            user: req.user,
            pedido,
            pageContent: 'edit-pedido',  // Changed from 'edit-pedido' to 'edit-pedido'
            pageTitle: `Editar Pedido #${pedido.id}`,
            formatPedidoStatus: (status) => {
                const statusMap = {
                    'PEDIDO_RECEBIDO': 'Pedido Recebido',
                    'PAGAMENTO_APROVADO': 'Pagamento Aprovado',
                    'EM_SEPARACAO': 'Em Separação',
                    'ENVIADO_TRANSPORTADORA': 'Enviado à Transportadora',
                    'EM_TRANSPORTE': 'Em Transporte',
                    'EM_ROTA_DE_ENTREGA': 'Em Rota de Entrega',
                    'ENTREGUE': 'Entregue',
                    'TROCA_DEVOLUCAO_SOLICITADA': 'Devolução Solicitada',
                    'TROCA_DEVOLUCAO_CONCLuÍDA': 'Devolução Concluída'
                };
                return statusMap[status] || status;
            }
        });
    } catch (error) {
        console.error('Erro ao carregar formulário de edição de pedido:', error);
        res.status(500).send('Erro ao carregar formulário de edição de pedido: ' + error.message);
    }
});

// Rota para atualizar o status de um pedido
router.put('/pedido/:id/status', authenticate, checkRole('ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        // Validação básica
        if (!status) {
            return res.status(400).json({ 
                success: false, 
                message: 'Status não fornecido' 
            });
        }
        
        // Verificar se o status é válido (usando o enum OrderStatus do Prisma)
        const validStatuses = Object.values(OrderStatus);
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Status inválido' 
            });
        }
        
        // Atualizar o status do pedido
        const pedido = await prisma.pedido.update({
            where: { id: parseInt(id) },
            data: { status }
        });
        
        res.json({
            success: true,
            message: 'Status do pedido atualizado com sucesso!',
            pedido
        });
    } catch (error) {
        console.error('Erro ao atualizar status do pedido:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao atualizar status do pedido',
            error: error.message
        });
    }
});

// Rota para fornecer estatísticas atualizadas para o dashboard
router.get('/dashboard-stats', authenticate, checkRole('ADMIN'), async (req, res) => {
    try {
        console.log('Getting dashboard stats...');
        
        // Calcular o primeiro dia do mês atual
        const dataInicio = new Date();
        dataInicio.setDate(1);
        dataInicio.setHours(0, 0, 0, 0);
        
        // Calcular o último dia do mês atual
        const dataFim = new Date();
        dataFim.setHours(23, 59, 59, 999);
        
        // Buscar todos os pedidos com seus itens
        const pedidos = await prisma.pedido.findMany({
            include: {
                orderItems: true
            }
        });
        
        // Calcular vendas totais do mês atual
        const pedidosMesAtual = pedidos.filter(pedido => {
            const pedidoDate = new Date(pedido.createdAt);
            return pedidoDate >= dataInicio && pedidoDate <= dataFim;
        });
        
        const totalVendasMesAtual = pedidosMesAtual.reduce((acc, pedido) => acc + pedido.totalAmount, 0);
        
        // Contagem de produtos vendidos no mês atual
        const produtosVendidosMesAtual = pedidosMesAtual.reduce((acc, pedido) => {
            return acc + pedido.orderItems.reduce((sum, item) => sum + item.quantity, 0);
        }, 0);
        
        // Calcular o primeiro dia do mês anterior
        const dataInicioMesAnterior = new Date(dataInicio);
        dataInicioMesAnterior.setMonth(dataInicioMesAnterior.getMonth() - 1);
        
        // Calcular o último dia do mês anterior
        const dataFimMesAnterior = new Date(dataInicio);
        dataFimMesAnterior.setDate(0);
        dataFimMesAnterior.setHours(23, 59, 59, 999);
        
        // Calcular vendas totais do mês anterior
        const pedidosMesAnterior = pedidos.filter(pedido => {
            const pedidoDate = new Date(pedido.createdAt);
            return pedidoDate >= dataInicioMesAnterior && pedidoDate <= dataFimMesAnterior;
        });
        
        const totalVendasMesAnterior = pedidosMesAnterior.reduce((acc, pedido) => acc + pedido.totalAmount, 0);
        
        // Calcular crescimento
        let crescimento = 0;
        if (totalVendasMesAnterior > 0) {
            crescimento = Math.round(((totalVendasMesAtual - totalVendasMesAnterior) / totalVendasMesAnterior) * 100);
        } else if (totalVendasMesAtual > 0) {
            crescimento = 100; // Se não havia vendas no mês anterior, crescimento = 100%
        }
        
        // Contagem de usuários ativos
        const totalUsuarios = await prisma.user.count({
            where: {
                role: 'USER'
            }
        });
        
        console.log('Dashboard stats calculated:');
        console.log('Total vendas:', totalVendasMesAtual);
        console.log('Total produtos:', produtosVendidosMesAtual);
        console.log('Crescimento:', crescimento);
        console.log('Total usuários:', totalUsuarios);
        
        res.json({
            success: true,
            totalVendas: totalVendasMesAtual,
            totalProdutos: produtosVendidosMesAtual,
            totalUsuarios,
            crescimento
        });
    } catch (error) {
        console.error('Erro ao buscar estatísticas do dashboard:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar estatísticas do dashboard',
            error: error.message
        });
    }
});

// Rota para obter contagem de pedidos por status
router.get('/pedidos-por-status', authenticate, checkRole('ADMIN'), async (req, res) => {
    try {
        // Buscar todos os pedidos
        const pedidos = await prisma.pedido.findMany();
        
        // Contagem de pedidos por status
        const pedidosPorStatus = {};
        Object.values(OrderStatus).forEach(status => {
            pedidosPorStatus[status] = 0;
        });
        
        pedidos.forEach(pedido => {
            if (pedido.status in pedidosPorStatus) {
                pedidosPorStatus[pedido.status]++;
            }
        });
        
        console.log('Pedidos por status (API):', pedidosPorStatus);
        
        res.json({
            success: true,
            statusCounts: pedidosPorStatus
        });
    } catch (error) {
        console.error('Erro ao buscar contagem de pedidos por status:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar contagem de pedidos por status',
            error: error.message
        });
    }
});

module.exports = router;
