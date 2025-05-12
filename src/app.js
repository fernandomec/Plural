const express = require('express');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
require('dotenv').config();

//express
const app = express();

//prisma client
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// EJS template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

//multer
const uploadsDir = path.join(__dirname, '..', 'public', 'uploads', 'empresas');
if (!fs.existsSync(uploadsDir)){
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const produtosUploadsDir = path.join(__dirname, '..', 'public', 'uploads', 'produtos');
if (!fs.existsSync(produtosUploadsDir)){
    fs.mkdirSync(produtosUploadsDir, { recursive: true });
}

//middlewares
app.use(bodyParser.json()); //body parser
app.use(express.urlencoded({ extended: true }));//formularios
app.use(express.json()); //JSON
app.use(express.static(path.join(__dirname, '..', 'public')));//public
app.use(cookieParser());
const authMiddleware = require('./middleware/auth');//autenticação
const { checkUser } = require('./middleware/auth');
app.use(checkUser);

const iniciarLimpador = require('./utils/limparCarrinho');

const limpadorInterval = iniciarLimpador();

process.on('SIGTERM', () => {
    clearInterval(limpadorInterval);
    process.exit(0);
});

app.use(async (req, res, next) => {
  try {
    const empresas = await prisma.empresa.findMany({
      select: {
        id: true,
        razaoSocial: true,
      }
    });
    res.locals.empresas = empresas;
    next();
  } catch (error) {
    console.error('Error fetching empresas:', error);
    res.locals.empresas = [];
    next();
  }
});

//servidor
const PORT = process.env.PORT || 3000;

async function main() {
  try {
    app.listen(PORT, () => {
      console.info(`Servidor rodando em http://localhost:${PORT}`);
    });
  } catch (e) {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  }
}
  
main();

//rotas
const authenticationRoutes = require('./routes/authentication');
const adminRoutes = require('./routes/admin');
const lojaRoutes = require('./routes/loja');
const userRoutes = require('./routes/user');
const orderRoutes = require('./routes/order');

console.log('--- Carregando Rotas Admin ---');
console.log('Tipo de adminRoutes:', typeof adminRoutes);
console.log('adminRoutes é uma função (router)?', typeof adminRoutes === 'function');
// Inspecionar se adminRoutes tem a estrutura esperada de um router Express
if (typeof adminRoutes === 'function' && adminRoutes.stack) {
    console.log('adminRoutes.stack (primeiras rotas):', adminRoutes.stack.slice(0, 2).map(layer => ({ name: layer.name, path: layer.route ? layer.route.path : undefined })));
} else {
    console.log('adminRoutes não parece ser um router Express válido ou está vazio.');
}

app.use('/', authenticationRoutes);
console.log("Montando adminRoutes em /admin");
app.use('/admin', adminRoutes);
app.use('/', lojaRoutes);
app.use('/', userRoutes);
app.use('/', orderRoutes);

//home
app.get('/', async (req, res) => {
  try {
    const empresas = await prisma.empresa.findMany({
      include: {
        bannerImagem: true, //inclui os dados da imagem do banner
      },
    });
    res.render('home', { user: res.locals.user, empresas: empresas });
  } catch (error) {
    console.error('Erro ao buscar empresas:', error);
    res.render('home', { user: res.locals.user, empresas: [] });
  }
});

//sobre
app.get('/about', (req, res) => {
  res.render('about', { user: res.locals.user });
});

//contato
app.get('/contact', (req, res) => {
  res.render('contact', { user: res.locals.user });
});

//404
app.use((req, res, next) => {
  res.status(404).render('404');
});