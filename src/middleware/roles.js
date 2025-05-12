const checkRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.redirect('/login');
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).render('403', { 
                user: req.user,
                message: 'Acesso negado: Você não tem permissão para acessar esta página'
            });
        }

        next();
    };
};

module.exports = { checkRole };
