const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const blacklist = [];

const authenticate = async (req, res, next) => {
    const token = req.cookies.auth_token;
    
    if (!token) {
        return res.redirect('/login');
    }

    if (blacklist.includes(token)) {
        res.clearCookie('auth_token');
        return res.redirect('/login');
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await prisma.user.findUnique({
            where: { email: decoded.email }
        });

        if (!user) {
            res.clearCookie('auth_token');
            return res.redirect('/login');
        }

        req.user = user;
        res.locals.user = user;
        next();
    } catch(err) {
        res.clearCookie('auth_token');
        res.redirect('/login');
    }
};

const checkUser = async (req, res, next) => {
    const token = req.cookies.auth_token;
    res.locals.user = null;
    
    if (token && !blacklist.includes(token)) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await prisma.user.findUnique({
                where: { email: decoded.email }
            });
            if (user) {
                res.locals.user = user;
            }
        } catch (err) {
            res.clearCookie('auth_token');
        }
    }
    next();
};

module.exports = { authenticate, blacklist, checkUser };