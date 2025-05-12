const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

//produtos
router.get('/lista', async (req, res) => {
    try {
      const produtos = await prisma.produto.findMany();
      res.render('lista', { produtos, user: res.locals.user });
    } catch (error) {
      console.error("Erro ao buscar produtos:", error);
      res.status(500).send("Erro ao buscar produtos.");
    }
});

//CREATE
router.get('/create', async (req, res) => {
    try {
        const empresas = await prisma.empresa.findMany();
        res.render('create', { user: res.locals.user, empresas });
    } catch (error) {
        console.error("Erro ao buscar empresas:", error);
        res.status(500).send("Erro ao carregar página de criação.");
    }
});

router.post('/create', async (req, res) => {
    try {
        await prisma.produto.create({
            data: {
                name: req.body.name,
                price: parseFloat(req.body.price),
                empresaId: parseInt(req.body.empresaId)
            }
        });
        res.redirect('/');
    } catch (error) {
        console.error("Erro ao criar produto:", error);
        res.status(500).send("Erro ao criar produto.");
    }
});

//EDIT:ID
router.get('/edit/:id', async (req, res) => {
  const produtoId = parseInt(req.params.id);
  try {
    const produto = await prisma.produto.findUnique({
      where: { id: produtoId }
    });
    if (produto) {
      res.render('edit', { produto, user: res.locals.user });
    } else {
      res.status(404).send('Produto não encontrado.');
    }
  } catch (error) {
      console.error("Erro ao buscar produto para edição:", error);
      res.status(500).send("Erro ao buscar produto.");
  }
});


//EDIT:ID
router.post('/edit/:id', async (req, res) => {
  const produtoId = parseInt(req.params.id);
  try {
    await prisma.produto.update({
      where: { id: produtoId },
      data: {
        name: req.body.name,
        price: parseFloat(req.body.price)
      }
    });

    res.redirect('/');
  } catch (error) {
      console.error("Erro ao atualizar produto:", error);
      res.status(500).send("Erro ao atualizar produto.");
  }
});

//DELETE:ID
router.get('/delete/:id', async (req, res) => {
    const produtoId = parseInt(req.params.id);
    try {
        await prisma.produto.delete({
            where: { id: produtoId }
        });
        res.redirect('/');
    } catch (error) {
        console.error("Erro ao deletar produto:", error);
        res.status(500).send("Erro ao deletar produto.");
    }
});
module.exports = router;