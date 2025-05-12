const express = require('express');
const router = express.Router();
const UserController = require('../controllers/UserController');
const { authenticate } = require('../middleware/auth');

router.get('/user', authenticate, UserController.getProfile);
router.get('/user-edit', authenticate, (req, res) => res.render('user-edit', { user: req.user }));
router.get('/user/edit', authenticate, UserController.editProfilePage);
router.post('/user-edit', authenticate, UserController.editProfile);

module.exports = router;
