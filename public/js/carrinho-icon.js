function mostrarNotificacao(mensagem, tipo = 'sucesso') {
    const notificacaoElemento = document.getElementById('notificacaoToastCarrinho');
    if (!notificacaoElemento) {
        alert(mensagem);
        return;
    }

    notificacaoElemento.textContent = mensagem;
    notificacaoElemento.className = 'notificacao-toast-carrinho';
    if (tipo === 'erro') {
        notificacaoElemento.classList.add('erro');
    }
    notificacaoElemento.classList.add('visivel');

    setTimeout(() => {
        notificacaoElemento.classList.remove('visivel');
    }, 3000);
}

function addToCart(productId, productName) {
    fetch('/carrinho/add', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productId: productId })
    })
    .then(response => {
        if (!response.ok) {
            return response.json()
                .catch(() => {
                    throw new Error(`Erro HTTP ${response.status} ao adicionar ao carrinho.`);
                })
                .then(errData => {
                    throw new Error(errData.message || errData.error || `Erro ${response.status} ao adicionar ao carrinho.`);
                });
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            const contadorCarrinhoElemento = document.getElementById('contadorCarrinho');
            const botaoCarrinhoElemento = document.getElementById('botaoCarrinhoFlutuante');

            if (contadorCarrinhoElemento && typeof data.totalItems === 'number') {
                contadorCarrinhoElemento.textContent = data.totalItems;
            }

            if (botaoCarrinhoElemento) {
                botaoCarrinhoElemento.classList.add('item-adicionado-animacao');
                setTimeout(() => {
                    botaoCarrinhoElemento.classList.remove('item-adicionado-animacao');
                }, 500);
            }
            
            const nomeDoProdutoParaExibir = productName || 'Produto';
            mostrarNotificacao(`${nomeDoProdutoParaExibir} adicionado ao carrinho!`, 'sucesso');

        } else {
            throw new Error(data.message || data.error || 'O servidor indicou um erro ao adicionar o item.');
        }
    })
    .catch(error => {
        console.error('Erro em addToCart:', error);
        mostrarNotificacao(error.message || 'Não foi possível adicionar o produto ao carrinho.', 'erro');
    });
}

async function atualizarContagemCarrinhoInicial() {
    try {
        const response = await fetch('/carrinho/status');
        if (!response.ok) {
            console.error('Erro ao buscar status inicial do carrinho:', response.status);
            return;
        }
        const data = await response.json();
        const cartCountElem = document.getElementById('contadorCarrinho');
        if (cartCountElem && typeof data.totalItems === 'number') {
            cartCountElem.textContent = data.totalItems;
        }
    } catch (error) {
        console.error('Erro ao buscar status inicial do carrinho:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const contadorCarrinhoElemento = document.getElementById('contadorCarrinho');
    if (contadorCarrinhoElemento && contadorCarrinhoElemento.textContent === '0' && typeof locals === 'undefined') {
         atualizarContagemCarrinhoInicial();
    } else if (typeof locals !== 'undefined' && typeof locals.totalItemsCarrinho === 'number') {
        if(contadorCarrinhoElemento) contadorCarrinhoElemento.textContent = locals.totalItemsCarrinho;
    } else if (contadorCarrinhoElemento && contadorCarrinhoElemento.textContent !== '0') {
         atualizarContagemCarrinhoInicial();
    } else {
        atualizarContagemCarrinhoInicial();
    }
});