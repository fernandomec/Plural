const { PrismaClient, OrderStatus } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = {
    async getCheckoutPage(req, res) {
        try {
            const userId = req.user.id;
            const carrinhoItems = await prisma.carrinho.findMany({
                where: { userId },
                include: {
                    product: {
                        include: {
                            images: true,
                            empresa: true,
                        }
                    }
                }
            });

            if (carrinhoItems.length === 0) {
                // Perhaps redirect to cart with a message or show an empty checkout
                return res.redirect('/carrinho');
            }

            let subtotal = 0;
            let empresaId = null; // Assuming all items in cart are from the same store for simplicity
            
            carrinhoItems.forEach(item => {
                let preco = item.product.preco;
                if (item.product.boolPromo && item.product.desconto) {
                    preco = preco * (1 - item.product.desconto / 100);
                }
                subtotal += item.quantidade * preco;
                if (!empresaId && item.product.empresaId) {
                    empresaId = item.product.empresaId;
                }
            });

            // For this example, we'll assume all items must be from the same empresa
            // Or the checkout needs to handle multiple empresas (more complex)
            if (!empresaId && carrinhoItems.length > 0) {
                 // Fallback if somehow empresaId was not set but items exist
                empresaId = carrinhoItems[0].product.empresaId;
            }


            res.render('checkout', {
                user: req.user,
                carrinhoItems,
                subtotal,
                empresaId, // Pass empresaId to be used in form if needed
                csrfToken: req.csrfToken ? req.csrfToken() : null // If CSRF is used
            });
        } catch (error) {
            console.error('Error getting checkout page:', error);
            res.status(500).render('404', { message: 'Erro ao carregar a página de checkout.' });
        }
    },

    async confirmCheckout(req, res) {
        try {
            const userId = req.user.id;
            const { paymentMethod, empresaIdHidden } = req.body; // empresaIdHidden from a hidden input

            const carrinhoItems = await prisma.carrinho.findMany({
                where: { userId },
                include: {
                    product: {
                        include: {
                            empresa: true,
                        }
                    }
                }
            });

            if (carrinhoItems.length === 0) {
                return res.status(400).send('Carrinho vazio.');
            }
            
            const empresaIdForOrder = parseInt(empresaIdHidden || carrinhoItems[0].product.empresaId);


            let totalAmount = 0;
            const orderItemsData = carrinhoItems.map(item => {
                let precoFinal = item.product.preco;
                if (item.product.boolPromo && item.product.desconto) {
                    precoFinal = precoFinal * (1 - item.product.desconto / 100);
                }
                totalAmount += item.quantidade * precoFinal;
                return {
                    productId: item.product.id,
                    productName: item.product.name,
                    productPrice: precoFinal,
                    quantity: item.quantidade,
                    empresaId: item.product.empresaId,
                    empresaName: item.product.empresa.razaoSocial,
                };
            });

            const pedido = await prisma.pedido.create({
                data: {
                    userId,
                    empresaId: empresaIdForOrder,
                    totalAmount,
                    paymentMethod: paymentMethod || "Não Especificado", // Pix Fictício / Boleto Fictício
                    status: OrderStatus.PEDIDO_RECEBIDO,
                    orderItems: {
                        create: orderItemsData
                    },
                    // shippingAddress: req.user.endereco // Or from form
                }
            });

            // Clear the cart
            await prisma.carrinho.deleteMany({
                where: { userId }
            });

            // Redirect to order status page or a success page
            res.redirect('/status-pedido');

        } catch (error) {
            console.error('Error confirming checkout:', error);
            res.status(500).render('404', { message: 'Erro ao confirmar o pedido.' });
        }
    },

    async getOrderStatusPage(req, res) {
        try {
            const userId = req.user.id;
            const pedidos = await prisma.pedido.findMany({
                where: { userId },
                include: {
                    orderItems: {
                        include: {
                            product: {
                                include: {
                                    images: true
                                }
                            }
                        }
                    },
                    empresa: true
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });

            res.render('status-pedido', {
                user: req.user,
                pedidos,
                OrderStatus // Pass enum for display
            });
        } catch (error) {
            console.error('Error getting order status page:', error);
            res.status(500).render('404', { message: 'Erro ao carregar o status dos pedidos.' });
        }
    }
};
