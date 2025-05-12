const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');

module.exports = {
    async getProfile(req, res) {
        res.render('user', { user: req.user });
    },

    async editProfilePage(req, res) {
        res.render('user-edit', { user: req.user });
    },

    async editProfile(req, res) {
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
                updateData.password = await bcrypt.hash(newPassword, 10);
            }

            await prisma.user.update({
                where: { id: req.user.id },
                data: updateData
            });

            res.redirect('/user');
        } catch (error) {
            res.status(500).json({ success: false, message: 'Erro ao atualizar usuário' });
        }
    }
};