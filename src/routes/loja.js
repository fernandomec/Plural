const express = require('express');
const router = express.Router();
const LojaController = require('../controllers/LojaController');

router.get('/lojas', LojaController.lojasPage);
router.get('/lojas/:id', LojaController.lojaById);
router.get('/lojas/:lojaId/produto/:produtoId', LojaController.productById);

module.exports = router;
