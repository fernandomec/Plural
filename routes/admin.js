console.log('--- Módulo admin.js carregado ---');

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { PrismaClient, OrderStatus } = require('@prisma/client'); // Garanta que OrderStatus foi importado
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');
const { authenticate } = require('../middleware/auth');
const { checkRole } = require('../middleware/roles');

// Configuração do Multer (storage)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let type = 'outros'; // Default type
        if (file.fieldname === 'bannerImagem' || file.fieldname === 'logoImagem') {
            type = 'empresas';
        } else if (file.fieldname === 'produtoImagem' || (file.fieldname === 'images' && req.path.includes('produto'))) {
            type = 'produtos';
        }
        const uploadPath = path.join(__dirname, '../../public/uploads', type);
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const allowedExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
        const fileExt = path.extname(file.originalname).toLowerCase();
        
        if (!allowedExtensions.includes(fileExt)) {
            return cb(new Error('Tipo de arquivo não permitido. Permitidos: ' + allowedExtensions.join(', ')));
        }
        
        cb(null, `${file.fieldname}-${Date.now()}${fileExt}`);
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    },
    fileFilter: function (req, file, cb) {
        const allowedExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
        const fileExt = path.extname(file.originalname).toLowerCase();
        if (!allowedExtensions.includes(fileExt)) {
            return cb(new Error('Tipo de arquivo não permitido. Use PNG, JPG, JPEG, WEBP ou GIF.'), false);
        }
        cb(null, true);
    }
});
// Fim da Configuração do Multer

// Rota de Admin Principal (já existe em authentication.js, esta é para API)
router.get('/', authenticate, checkRole('ADMIN'), (req, res) => {
    res.json({ message: 'API Admin principal acessada. A página é renderizada por outra rota.' });
});

// Rota de teste para verificar se o serviço de admin está funcionando
router.get('/ping', authenticate, checkRole('ADMIN'), (req, res) => {
    console.log('Admin ping route accessed successfully');
    res.status(200).json({ message: 'Admin API está funcionando!' });
});

// EMPRESAS
router.get('/empresas', authenticate, checkRole('ADMIN'), async (req, res) => {
    try {
        const empresas = await prisma.empresa.findMany();
        res.json(empresas);
    } catch (error) {
        console.error('Erro ao listar empresas (admin):', error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/empresa', authenticate, checkRole('ADMIN'), upload.fields([
    { name: 'bannerImagem', maxCount: 1 },
    { name: 'logoImagem', maxCount: 1 }
]), async (req, res) => {
    try {
        const { razaoSocial, nomeFantasia, email, password, cnpj, telefone, sobre, slogan, enderecoCompleto, horarioAtendimento } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);

        let bannerId = null;
        if (req.files && req.files.bannerImagem && req.files.bannerImagem[0]) {
            const bannerFile = req.files.bannerImagem[0];
            const imagemBanner = await prisma.imagem.create({
                data: {
                    filename: bannerFile.filename,
                    endereco: `/uploads/empresas/${bannerFile.filename}`,
                    tipo: 'banner_empresa'
                }
            });
            bannerId = imagemBanner.id;
        }

        let logoId = null;
        if (req.files && req.files.logoImagem && req.files.logoImagem[0]) {
            const logoFile = req.files.logoImagem[0];
            const imagemLogo = await prisma.imagem.create({
                data: {
                    filename: logoFile.filename,
                    endereco: `/uploads/empresas/${logoFile.filename}`,
                    tipo: 'logo_empresa'
                }
            });
            logoId = imagemLogo.id;
        }

        await prisma.empresa.create({
            data: {
                razaoSocial,
                nomeFantasia,
                email,
                password: hashedPassword,
                cnpj,
                telefone,
                sobre,
                slogan,
                enderecoCompleto,
                horarioAtendimento,
                bannerId: bannerId,
                logoId: logoId,
            }
        });
        // res.redirect('/admin?success=empresa_criada');
        res.status(201).json({ success: true, message: 'Empresa criada com sucesso!'});
    } catch (error) {
        console.error('Erro ao criar empresa:', error);
        res.status(500).json({ error: error.message, details: error.stack });
    }
});

router.delete('/empresa/:id', authenticate, checkRole('ADMIN'), async (req, res) => {
    try {
        const empresaId = parseInt(req.params.id);
        // Adicionar lógica para deletar imagens associadas do sistema de arquivos se necessário
        // e tratar dependências (produtos, categorias, pedidos)
        await prisma.empresa.delete({ where: { id: empresaId } });
        res.json({ success: true, message: 'Empresa deletada com sucesso.' });
    } catch (error) {
        console.error('Erro ao deletar empresa:', error);
        res.status(500).json({ success: false, message: 'Erro ao deletar empresa.', error: error.message });
    }
});

// CATEGORIAS
router.get('/categorias', authenticate, checkRole('ADMIN'), async (req, res) => {
    try {
        const categorias = await prisma.category.findMany({
            include: { 
                empresa: {
                    select: { id: true, razaoSocial: true }
                } 
            }
        });
        console.log('Categorias encontradas:', categorias.length);
        res.json(categorias);
    } catch (error) {
        console.error('Erro ao listar categorias (admin):', error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/categorias/:empresaId', authenticate, checkRole('ADMIN'), async (req, res) => {
    try {
        const categorias = await prisma.category.findMany({
            where: { empresaId: parseInt(req.params.empresaId) }
        });
        res.json(categorias);
    } catch (error) {
        console.error('Erro ao buscar categorias por empresa (admin):', error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/categoria', authenticate, checkRole('ADMIN'), async (req, res) => {
    try {
        const { name, empresaId } = req.body;
        await prisma.category.create({
            data: { name, empresaId: parseInt(empresaId) }
        });
        // res.redirect('/admin?success=categoria_criada');
        res.status(201).json({ success: true, message: 'Categoria criada com sucesso!'});
    } catch (error) {
        console.error('Erro ao criar categoria:', error);
        res.status(500).json({ error: error.message });
    }
});

router.delete('/categoria/:id', authenticate, checkRole('ADMIN'), async (req, res) => {
    try {
        const categoriaId = parseInt(req.params.id);
        // Adicionar lógica para tratar produtos associados a esta categoria se necessário
        await prisma.category.delete({ where: { id: categoriaId } });
        res.json({ success: true, message: 'Categoria deletada com sucesso.' });
    } catch (error) {
        console.error('Erro ao deletar categoria:', error);
        res.status(500).json({ success: false, message: 'Erro ao deletar categoria.', error: error.message });
    }
});

// PRODUTOS
router.get('/produtos', authenticate, checkRole('ADMIN'), async (req, res) => {
    try {
        const produtos = await prisma.product.findMany({
            include: { empresa: true, category: true }
        });
        res.json(produtos);
    } catch (error) {
        console.error('Erro ao listar produtos (admin):', error);
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

        // Cria o produto primeiro
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
                userId: req.user.id
            }
        });

        // Se houver imagem, cria a imagem e associa ao produto
        if (req.file) {
            await prisma.imagem.create({
                data: {
                    filename: req.file.filename,
                    endereco: `/uploads/produtos/${req.file.filename}`,
                    productId: produto.id
                }
            });
        }

        res.json({ success: true, message: 'Produto criado com sucesso!' });
    } catch (error) {
        console.error('Erro ao criar produto:', error);
        res.status(500).json({ error: error.message });
    }
});

router.delete('/produto/:id', authenticate, checkRole('ADMIN'), async (req, res) => {
    try {
        const produtoId = parseInt(req.params.id);
        // Adicionar lógica para deletar imagens associadas do sistema de arquivos e do DB
        await prisma.imagem.deleteMany({ where: { productId: produtoId }});
        await prisma.product.delete({ where: { id: produtoId } });
        res.json({ success: true, message: 'Produto deletado com sucesso.' });
    } catch (error) {
        console.error('Erro ao deletar produto:', error);
        res.status(500).json({ success: false, message: 'Erro ao deletar produto.', error: error.message });
    }
});

// USUÁRIOS (Gerenciar Acessos)
router.get('/usuarios', authenticate, checkRole('ADMIN'), async (req, res) => {
    try {
        const usuarios = await prisma.user.findMany({
            select: { id: true, email: true, username: true, role: true }
        });
        res.json(usuarios);
    } catch (error) {
        console.error('Erro ao listar usuários (admin):', error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/search-user', authenticate, checkRole('ADMIN'), async (req, res) => {
    try {
        const { email } = req.query;
        const user = await prisma.user.findUnique({
            where: { email },
            select: { id: true, email: true, username: true, role: true }
        });
        if (user) {
            res.json({ success: true, user });
        } else {
            res.json({ success: false, message: 'Usuário não encontrado.' });
        }
    } catch (error) {
        console.error('Erro ao buscar usuário (admin):', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/update-role', authenticate, checkRole('ADMIN'), async (req, res) => {
    try {
        const { userId, role } = req.body;
        await prisma.user.update({
            where: { id: parseInt(userId) },
            data: { role: role }
        });
        // res.redirect('/admin?success=role_atualizada');
        res.status(200).json({ success: true, message: 'Role atualizada com sucesso!'});
    } catch (error) {
        console.error('Erro ao atualizar role (admin):', error);
        res.status(500).json({ error: error.message });
    }
});

// Nova rota para deletar usuários
router.delete('/usuario/:id', authenticate, checkRole('ADMIN'), async (req, res) => {
    try {
        const usuarioId = parseInt(req.params.id);
        
        // Verificar se o usuário a ser deletado não é o próprio admin logado
        if (usuarioId === req.user.id) {
            return res.status(400).json({ 
                success: false, 
                message: 'Você não pode deletar seu próprio usuário.'
            });
        }
        
        await prisma.user.delete({ where: { id: usuarioId } });
        res.json({ success: true, message: 'Usuário deletado com sucesso.' });
    } catch (error) {
        console.error('Erro ao deletar usuário:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao deletar usuário.', 
            error: error.message 
        });
    }
});

// PEDIDOS - Admin
router.get('/pedidos', authenticate, checkRole('ADMIN'), async (req, res) => {
    console.log(`[${new Date().toISOString()}] GET /admin/pedidos - ROTA ATINGIDA (COM AUTH)`);
    try {
        const { pesquisa } = req.query;
        let pedidos;

        const includeOptions = {
            user: { select: { email: true, username: true } },
            empresa: { select: { razaoSocial: true } },
            orderItems: {
                include: {
                    product: { 
                        select: { 
                            name: true,
                            images: {
                                select: {
                                    endereco: true
                                }
                            }
                        } 
                    }
                }
            }
        };

        if (pesquisa) {
            const idPedido = parseInt(pesquisa);
            if (isNaN(idPedido)) {
                console.log('Query de pesquisa não é um número válido:', pesquisa);
                return res.status(400).json({ message: 'ID do pedido inválido para busca.' });
            }
            console.log('Pesquisando por ID do pedido:', idPedido);
            pedidos = await prisma.pedido.findUnique({
                where: { id: idPedido },
                include: includeOptions
            });
            if (!pedidos) {
                // Retorna um array vazio para consistência no frontend
                return res.json([]);
            }
             // Garante que o resultado seja sempre um array para o frontend
            pedidos = [pedidos];
        } else {
            console.log('Buscando todos os pedidos.');
            pedidos = await prisma.pedido.findMany({
                include: includeOptions,
                orderBy: { createdAt: 'desc' }
            });
        }
        console.log('Dados dos pedidos encontrados:', pedidos.length);
        res.json(pedidos);

    } catch (error) {
        console.error(`[${new Date().toISOString()}] Erro na rota /admin/pedidos:`, error);
        res.status(500).json({ message: 'Erro interno no servidor ao buscar pedidos.', error: error.message, stack: error.stack });
    }
});

router.post('/pedidos/:id/update-status', authenticate, checkRole('ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        console.log(`Atualizando status do pedido #${id} para: ${status}`);

        if (!Object.values(OrderStatus).includes(status)) {
            return res.status(400).json({ error: 'Status inválido. Valores permitidos: ' + Object.values(OrderStatus).join(', ') });
        }

        const updatedPedido = await prisma.pedido.update({
            where: { id: parseInt(id) },
            data: { status: status }
        });
        console.log('Pedido atualizado com sucesso:', updatedPedido);
        res.json({ success: true, pedido: updatedPedido });
    } catch (error) {
        console.error('Erro ao atualizar status do pedido (admin):', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;