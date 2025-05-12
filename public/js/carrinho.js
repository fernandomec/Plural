async function updateQuantity(itemId, delta) {
    try {
        const response = await fetch('/carrinho/update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ itemId, delta })
        });

        if (!response.ok) {
            throw new Error('Erro na resposta do servidor');
        }

        const data = await response.json();
        
        const quantityElement = document.querySelector(`tr[data-item-id="${itemId}"] .quantidade-container span`);
        const currentQuantity = parseInt(quantityElement.textContent);
        const newQuantity = currentQuantity + delta;

        if (newQuantity <= 0) {
            // Se quantidade <= 0, remove o item
            await removeItem(itemId);
            return;
        }

        // Atualiza a quantidade
        quantityElement.textContent = newQuantity;

        // Atualiza o total do item
        const priceElement = document.querySelector(`tr[data-item-id="${itemId}"] td:nth-child(2)`);
        const price = parseFloat(priceElement.textContent.replace('R$ ', '').replace(',', '.'));
        const totalElement = document.querySelector(`tr[data-item-id="${itemId}"] td:nth-child(4)`);
        totalElement.textContent = `R$ ${(price * newQuantity).toFixed(2)}`;

        updateCartTotal();
    } catch (error) {
        console.error('Erro:', error);
    }
}

async function removeItem(itemId) {
    try {
        const response = await fetch('/carrinho/remove', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ itemId })
        });

        if (!response.ok) {
            throw new Error('Erro na resposta do servidor');
        }

        const data = await response.json();
        
        // Remove o item visualmente
        const itemRow = document.querySelector(`tr[data-item-id="${itemId}"]`);
        if (itemRow) {
            itemRow.remove();
            updateCartTotal();
        }

        // Se não houver mais itens, recarrega a página
        const remainingItems = document.querySelectorAll('tbody tr').length;
        if (remainingItems === 0) {
            window.location.reload();
        }
    } catch (error) {
        console.error('Erro:', error);
    }
}

function updateCartTotal() {
    fetch('/carrinho')
        .then(response => response.text())
        .then(html => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const subtotal = doc.querySelector('#subtotal-row td[data-subtotal]').textContent;
            const total = doc.querySelector('.total-row td:last-child').textContent;

            document.querySelector('#subtotal-row td[data-subtotal]').textContent = subtotal;
            document.querySelector('.total-row td:last-child').textContent = total;
        })
        .catch(error => {
            console.error('Erro ao atualizar total:', error);
        });
}

// Executar updateCartTotal quando a página carrega
document.addEventListener('DOMContentLoaded', updateCartTotal);
