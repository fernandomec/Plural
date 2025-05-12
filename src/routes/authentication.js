const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { authenticate, blacklist } = require('../middleware/auth');
const validatePassword = require('../utils/passwordValidator');
const { checkRole } = require('../middleware/roles');

//login
router.get('/login', (req, res) => {
    const token = req.cookies.auth_token;
    if (token) {
        try {
            jwt.verify(token, process.env.JWT_SECRET);
            return res.redirect('/user');
        } catch (err) {
            res.clearCookie('auth_token');
        }
    }
    res.render('login', { user: null });
});
router.post('/login', async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { email: req.body.email }
        });

        if (!user || !(await bcrypt.compare(req.body.password, user.password))) {
            return res.status(401).json({
                auth: false,
                message: 'Email ou senha inválidos.'
            });
        }

        const token = jwt.sign(
            { email: user.email, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.cookie('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 86400000 //24h
        });

        return res.json({
            auth: true,
            token,
            user: { email: user.email, username: user.username }
        });
    } catch (error) {
        res.status(500).json({
            auth: false,
            message: 'Erro interno do servidor.'
        });
    }
});

//registro
router.get('/register', (req, res) => {
    const token = req.cookies.auth_token;
    if (token) {
        try {
            jwt.verify(token, process.env.JWT_SECRET);
            return res.redirect('/user');
        } catch (err) {
            res.clearCookie('auth_token');
        }
    }
    res.render('register', { user: null });
});
router.post('/register', async (req, res) => {
    try {
        const { email, username, password } = req.body;
        
        const passwordValidationResult = validatePassword(password);
        if (!passwordValidationResult.isValid) {
            return res.status(400).json({
                success: false,
                message: passwordValidationResult.message
            });
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Email já está em uso.'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await prisma.user.create({
            data: { email, username, password: hashedPassword }
        });


        res.status(201).json({
            success: true,
            message: 'Usuário criado com sucesso!'
        });
    } catch (error) {        
        res.status(500).json({
            success: false,
            message: 'Erro ao criar conta: ' + error.message
        });
    }
});

//logout
router.post('/logout', (req, res) => {
    try {
        const token = req.cookies.auth_token;
        if (token) {
            blacklist.push(token);
            res.clearCookie('auth_token', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                path: '/'
            });
        }
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Erro no logout:', error);
        res.status(500).json({ success: false });
    }
});

//página do usuário
router.get('/user', authenticate, async (req, res) => {
    try {
        if (!req.user) {
            return res.redirect('/login');
        }

        const carrinho = await prisma.carrinho.findMany({
            where: { userId: req.user.id },
            include: { product: true }
        });

        let totalItems = carrinho.reduce((soma, item) => soma + item.quantidade, 0);

        res.locals.carrinho = {
            items: carrinho,
            totalItems: totalItems
        };

        res.render('user', { user: req.user });
    } catch (error) {
        console.error('Erro ao carregar página do usuário:', error);
        res.status(500).send('Erro ao carregar página do usuário');
    }
});

//editar usuário
router.get('/user-edit', authenticate, (req, res) => {
    res.render('user-edit', { user: req.user });
});

router.post('/user-edit', authenticate, async (req, res) => {
    try {
        const { 
            username, 
            newPassword, 
            tel,
            cep, 
            bairro,
            endereco, 
            enderecoComplemento, 
            currentPassword 
        } = req.body;
        
        console.log('Received data:', {
            username, tel, cep, bairro, endereco, enderecoComplemento
        });

        const isValidPassword = await bcrypt.compare(currentPassword, req.user.password);
        if (!isValidPassword) {
            return res.status(401).json({ success: false, message: 'Senha atual incorreta' });
        }

        const updateData = {
            username,
            tel,
            cep,
            bairro,
            endereco,
            enderecoComplemento,
        };

        if (newPassword) {
            await prisma.pastPassword.create({
                data: {
                    password: req.user.password,
                    userId: req.user.id,
                    createdAt: new Date()
                }
            });
            updateData.password = await bcrypt.hash(newPassword, 10);
        }

        const updatedUser = await prisma.user.update({
            where: { id: req.user.id },
            data: updateData
        });

        console.log('Usuário atualizado:', updatedUser);
        res.redirect('/user');
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Erro ao atualizar usuário' });
    }
});

//admin
router.get('/admin', authenticate, checkRole('ADMIN'), async (req, res) => {
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
});

//editor
router.get('/editor', authenticate, checkRole('ADMIN', 'EDITOR'), (req, res) => {
    res.render('editor', { user: req.user });
});

//carrinho
router.get('/carrinho', authenticate, async (req, res) => {
    try {
        const carrinho = await prisma.carrinho.findMany({
            where: { userId: req.user.id },
            include: { 
                product: {
                    include: {
                        images: true
                    }
                }
            }
        });

        let total = carrinho.reduce((soma, item) => {
            let preco = item.product.preco;
            if (item.product.boolPromo && item.product.desconto) {
                preco = preco * (1 - item.product.desconto / 100);
            }
            return soma + (item.quantidade * preco);
        }, 0);

        res.render('carrinho', {
            user: req.user,
            carrinho: {
                items: carrinho,
                total: total,
                desconto: 0
            }
        });
    } catch (error) {
        console.error('Erro ao carregar carrinho:', error);
        res.status(500).send('Erro ao carregar carrinho');
    }
});

router.post('/carrinho/add', authenticate, async (req, res) => {
    try {
        const { productId } = req.body;
        const userId = req.user.id;

        const existingItem = await prisma.carrinho.findUnique({
            where: {
                userId_productId: {
                    userId: userId,
                    productId: parseInt(productId)
                }
            }
        });

        if (existingItem) {
            await prisma.carrinho.update({
                where: {
                    userId_productId: {
                        userId: userId,
                        productId: parseInt(productId)
                    }
                },
                data: {
                    quantidade: existingItem.quantidade + 1
                }
            });
        } else {
            await prisma.carrinho.create({
                data: {
                    userId: userId,
                    productId: parseInt(productId),
                    quantidade: 1
                }
            });
        }

        const carrinho = await prisma.carrinho.findMany({
            where: { userId: userId },
            include: { product: true }
        });

        let total = carrinho.reduce((soma, item) => {
            let preco = item.product.preco;
            if (item.product.boolPromo && item.product.desconto) {
                preco = preco * (1 - item.product.desconto / 100);
            }
            return soma + (item.quantidade * preco);
        }, 0);

        const totalItems = await prisma.carrinho.aggregate({
            _sum: {
                quantidade: true
            },
            where: { userId: userId }
        });

        res.json({
            success: true,
            totalItems: totalItems._sum.quantidade || 0,
            total: total,
            desconto: 0 // Removido desconto fixo
        });
    } catch (error) {
        console.error('Erro ao adicionar ao carrinho:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/carrinho/update', authenticate, async (req, res) => {
    try {
        const { itemId, delta } = req.body;
        const userId = req.user.id;

        const item = await prisma.carrinho.findUnique({
            where: {
                id: parseInt(itemId)
            }
        });

        if (!item || item.userId !== userId) {
            return res.status(404).json({ success: false, message: 'Item não encontrado' });
        }

        const newQuantidade = item.quantidade + delta;
        if (newQuantidade <= 0) {
            await prisma.carrinho.delete({
                where: { id: parseInt(itemId) }
            });
        } else {
            await prisma.carrinho.update({
                where: { id: parseInt(itemId) },
                data: { quantidade: newQuantidade }
            });
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/carrinho/remove', authenticate, async (req, res) => {
    try {
        const { itemId } = req.body;
        const userId = req.user.id;

        const item = await prisma.carrinho.findUnique({
            where: { id: parseInt(itemId) }
        });

        if (!item || item.userId !== userId) {
            return res.status(404).json({ success: false, message: 'Item não encontrado' });
        }

        await prisma.carrinho.delete({
            where: { id: parseInt(itemId) }
        });

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;