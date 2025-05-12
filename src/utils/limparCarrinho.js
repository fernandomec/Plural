const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function limparCarrinhosAntigos() {
    try {
        const tempoLimite = new Date(Date.now() - 30 * 60 * 1000); //30 minutos
        
        const deletedCarrinhos = await prisma.carrinho.deleteMany({
            where: {
                updatedAt: {
                    lt: tempoLimite
                }
            }
        });
        
        if (deletedCarrinhos.count > 0) {
            console.log(`[${new Date().toLocaleTimeString()}] - Carrinhos removidos: ${deletedCarrinhos.count}`);
        }
    } catch (error) {
        console.error('Erro ao limpar carrinhos:', error);
    }
}

function iniciarLimpador() {
    limparCarrinhosAntigos();
    return setInterval(limparCarrinhosAntigos, 30 * 60 * 1000); //30 minutos
}

module.exports = iniciarLimpador;
