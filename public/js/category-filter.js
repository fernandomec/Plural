document.addEventListener('DOMContentLoaded', function() {
    const todosOsBotoesFiltro = document.querySelectorAll('.botao-filtro');
    const todosOsProdutos = document.querySelectorAll('.card-produto');
    const dropdownCategorias = document.querySelector('.dropdown-categorias');
    const botaoDropdownToggle = document.querySelector('.botao-dropdown-toggle');
    const menuDropdown = document.querySelector('.dropdown-menu');

    todosOsBotoesFiltro.forEach(botao => {
        botao.addEventListener('click', () => {
            const categoriaSelecionada = botao.dataset.category;
            
            todosOsBotoesFiltro.forEach(btn => btn.classList.remove('active'));
            
            if (botaoDropdownToggle && menuDropdown && menuDropdown.contains(botao)) {
                botao.classList.add('active');
                const botaoTodosPrincipal = document.querySelector('.filtro-categorias > .botao-filtro[data-category="all"]');
                if (botaoTodosPrincipal) {
                    botaoTodosPrincipal.classList.remove('active');
                }
                botaoDropdownToggle.innerHTML = `${botao.textContent.trim()} <span class="material-symbols-outlined">arrow_drop_down</span>`;
                if(dropdownCategorias) dropdownCategorias.classList.remove('open');
            } else {
                botao.classList.add('active');
                if (categoriaSelecionada === 'all' && botaoDropdownToggle) {
                    botaoDropdownToggle.innerHTML = `Filtrar por Categoria <span class="material-symbols-outlined">arrow_drop_down</span>`;
                    menuDropdown?.querySelectorAll('.botao-filtro').forEach(btn => btn.classList.remove('active'));
                }
            }
            
            todosOsProdutos.forEach(produto => {
                if (categoriaSelecionada === 'all' || produto.dataset.category === categoriaSelecionada) {
                    produto.style.display = 'flex';
                } else {
                    produto.style.display = 'none';
                }
            });
        });
    });

    if (dropdownCategorias && botaoDropdownToggle) {
        botaoDropdownToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            dropdownCategorias.classList.toggle('open');
        });
        document.addEventListener('click', function(e) {
            if (dropdownCategorias && !dropdownCategorias.contains(e.target)) {
                dropdownCategorias.classList.remove('open');
            }
        });
    }
}); 