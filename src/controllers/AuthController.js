const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const validatePassword = require('../utils/passwordValidator');
const { blacklist } = require('../middleware/auth');

module.exports = {
    async loginPage(req, res) {
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
    },

    async registerPage(req, res) {
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
    },

    async login(req, res) {
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
    },

    async register(req, res) {
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
            await prisma.user.create({
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
    },

    async logout(req, res) {
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
            res.status(500).json({ success: false });
        }
    }
};