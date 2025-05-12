const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs'); // Adicionando import do fs
const { PrismaClient } = require('@prisma/client');
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

//listar empresas
router.get('/empresas', authenticate, checkRole('ADMIN'), async (req, res) => {
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

module.exports = router;
