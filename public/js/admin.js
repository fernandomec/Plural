// Funções auxiliares para exibir mensagens
function showAdminMessage(message, type = 'success') {
    // Você pode implementar um sistema de notificação mais robusto aqui
    alert(message);
    if (type === 'success') console.log(message);
    else console.error(message);
}

// Adicionar uma variável global para o enum OrderStatus
const OrderStatus = {
    PEDIDO_RECEBIDO: 'PEDIDO_RECEBIDO',
    EM_PROCESSAMENTO: 'EM_PROCESSAMENTO',
    ENVIADO: 'ENVIADO',
    ENTREGUE: 'ENTREGUE',
    CANCELADO: 'CANCELADO'
};

// EMPRESAS
async function fetchEmpresas() {
    try {
        const response = await fetch('/admin/api/empresas');
        if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
        const empresas = await response.json();
        displayEmpresas(empresas);
    } catch (error) {
        console.error('Erro ao buscar empresas:', error);
        document.getElementById('empresasList').innerHTML = `<p class="error-message">Erro ao carregar empresas: ${error.message}</p>`;
    }
}

function displayEmpresas(empresas) {
    const container = document.getElementById('empresasList');
    container.innerHTML = ''; // Limpa conteúdo anterior

    if (!empresas || empresas.length === 0) {
        container.innerHTML = '<p>Nenhuma empresa encontrada.</p>';
        return;
    }

    const table = document.createElement('table');
    table.className = 'admin-table';
    table.innerHTML = `
        <thead>
            <tr>
                <th>ID</th>
                <th>Razão Social</th>
                <th>Email</th>
                <th>CNPJ</th>
                <th>Ações</th>
            </tr>
        </thead>
        <tbody>
            ${empresas.map(empresa => `
                <tr>
                    <td>${empresa.id}</td>
                    <td>${empresa.razaoSocial}</td>
                    <td>${empresa.email}</td>
                    <td>${empresa.cnpj}</td>
                    <td>
                        <button onclick="deleteEmpresa(${empresa.id})" class="delete-button"><i class="fas fa-trash"></i> Deletar</button>
                    </td>
                </tr>
            `).join('')}
        </tbody>
    `;
    container.appendChild(table);
}

// CATEGORIAS
async function fetchCategorias() {
    try {
        console.log('Iniciando busca de categorias...');
        const response = await fetch('/admin/categorias');
        console.log('Status da resposta:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Erro na resposta da API:', errorText);
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        
        const categorias = await response.json();
        console.log('Categorias recebidas:', categorias.length);
        displayCategorias(categorias);
    } catch (error) {
        console.error('Erro ao buscar categorias:', error);
        document.getElementById('categoriasList').innerHTML = `<p class="error-message">Erro ao carregar categorias: ${error.message}</p>`;
    }
}

function displayCategorias(categorias) {
    const container = document.getElementById('categoriasList');
    if (!container) {
        console.error('Elemento categoriasList não encontrado no DOM');
        return;
    }
    
    container.innerHTML = '';

    if (!categorias || categorias.length === 0) {
        container.innerHTML = '<p>Nenhuma categoria encontrada.</p>';
        return;
    }

    const table = document.createElement('table');
    table.className = 'admin-table';
    table.innerHTML = `
        <thead>
            <tr>
                <th>ID</th>
                <th>Nome</th>
                <th>Empresa</th>
                <th>Ações</th>
            </tr>
        </thead>
        <tbody>
            ${categorias.map(cat => `
                <tr>
                    <td>${cat.id}</td>
                    <td>${cat.name}</td>
                    <td>${cat.empresa ? cat.empresa.razaoSocial : 'N/A'}</td>
                    <td>
                        <button onclick="deleteCategoria(${cat.id})" class="delete-button"><i class="fas fa-trash"></i> Deletar</button>
                    </td>
                </tr>
            `).join('')}
        </tbody>
    `;
    container.appendChild(table);
}

// PRODUTOS
async function fetchProdutos() {
    try {
        const response = await fetch('/admin/produtos');
        if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
        const produtos = await response.json();
        displayProdutos(produtos);
    } catch (error) {
        console.error('Erro ao buscar produtos:', error);
        document.getElementById('produtosList').innerHTML = `<p class="error-message">Erro ao carregar produtos: ${error.message}</p>`;
    }
}

function displayProdutos(produtos) {
    const container = document.getElementById('produtosList');
    container.innerHTML = '';

    if (!produtos || produtos.length === 0) {
        container.innerHTML = '<p>Nenhum produto encontrado.</p>';
        return;
    }

    const table = document.createElement('table');
    table.className = 'admin-table';
    table.innerHTML = `
        <thead>
            <tr>
                <th>ID</th>
                <th>Nome</th>
                <th>Preço</th>
                <th>Empresa</th>
                <th>Categoria</th>
                <th>Ações</th>
            </tr>
        </thead>
        <tbody>
            ${produtos.map(prod => `
                <tr>
                    <td>${prod.id}</td>
                    <td>${prod.name}</td>
                    <td>R$ ${parseFloat(prod.preco).toFixed(2)}</td>
                    <td>${prod.empresa ? prod.empresa.razaoSocial : 'N/A'}</td>
                    <td>${prod.category ? prod.category.name : 'N/A'}</td>
                    <td>
                        <button onclick="deleteProduto(${prod.id})" class="delete-button"><i class="fas fa-trash"></i> Deletar</button>
                    </td>
                </tr>
            `).join('')}
        </tbody>
    `;
    container.appendChild(table);
}

// USUÁRIOS (Gerenciar Acessos)
async function fetchUsuarios() {
    try {
        const response = await fetch('/admin/usuarios');
        if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
        const usuarios = await response.json();
        displayUsuarios(usuarios);
    } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        document.getElementById('usuariosList').innerHTML = `<p class="error-message">Erro ao carregar usuários: ${error.message}</p>`;
    }
}

function displayUsuarios(usuarios) {
    const container = document.getElementById('usuariosList');
    container.innerHTML = '';
    container.style.display = 'block';

    if (!usuarios || usuarios.length === 0) {
        container.innerHTML = '<p>Nenhum usuário encontrado.</p>';
        return;
    }
    const table = document.createElement('table');
    table.className = 'admin-table';
    table.innerHTML = `
        <thead>
            <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Ações</th>
            </tr>
        </thead>
        <tbody>
            ${usuarios.map(user => `
                <tr>
                    <td>${user.id}</td>
                    <td>${user.username}</td>
                    <td>${user.email}</td>
                    <td><span class="category-tag">${user.role}</span></td>
                    <td>
                        <button onclick="deleteUsuario(${user.id})" class="delete-button"><i class="fas fa-trash"></i> Deletar</button>
                    </td>
                </tr>
            `).join('')}
        </tbody>
    `;
    container.appendChild(table);
}

// Nova função para deletar usuários
async function deleteUsuario(usuarioId) {
    if (!confirm(`Tem certeza que deseja deletar o usuário ID ${usuarioId}? Esta ação não pode ser revertida.`)) {
        return;
    }
    try {
        const response = await fetch(`/admin/usuario/${usuarioId}`, { method: 'DELETE' });
        const data = await response.json();
        if (response.ok && data.success) {
            showAdminMessage(data.message || 'Usuário deletado com sucesso!');
            fetchUsuarios(); // Atualiza a lista
        } else {
            throw new Error(data.message || 'Erro ao deletar usuário.');
        }
    } catch (error) {
        console.error('Erro ao deletar usuário:', error);
        showAdminMessage(error.message, 'error');
    }
}

async function searchUser() {
    const email = document.getElementById('searchEmail').value;
    const resultDiv = document.getElementById('userSearchResult');
    const roleForm = document.getElementById('roleForm');
    resultDiv.innerHTML = '';
    roleForm.style.display = 'none';

    if (!email) {
        resultDiv.innerHTML = '<p class="error-message">Digite um email para buscar.</p>';
        return;
    }

    try {
        const response = await fetch(`/admin/search-user?email=${encodeURIComponent(email)}`);
        const data = await response.json();

        if (response.ok && data.success && data.user) {
            resultDiv.innerHTML = `
                <div class="success-message">
                    <strong>Usuário Encontrado:</strong><br>
                    ID: ${data.user.id}<br>
                    Email: ${data.user.email}<br>
                    Nome: ${data.user.username}<br>
                    Role Atual: ${data.user.role}
                </div>`;
            document.getElementById('userId').value = data.user.id;
            document.getElementById('role').value = data.user.role;
            roleForm.style.display = 'block';
        } else {
            resultDiv.innerHTML = `<p class="error-message">${data.message || 'Usuário não encontrado.'}</p>`;
        }
    } catch (error) {
        console.error('Erro ao buscar usuário:', error);
        resultDiv.innerHTML = `<p class="error-message">Erro de comunicação ao buscar usuário.</p>`;
    }
}

// Controle de promoção no formulário de produto
document.getElementById('boolPromo')?.addEventListener('change', function(e) {
    const descontoGroup = document.getElementById('descontoGroup');
    const descontoInput = document.getElementById('desconto');
    
    if (descontoGroup) { // Check if descontoGroup was found
        descontoGroup.style.display = e.target.checked ? 'block' : 'none';
    } else {
        console.error('Element with ID "descontoGroup" not found.'); // Log an error for debugging
    }
    
    if (!e.target.checked) {
        if (descontoInput) { // This check for descontoInput is good
            descontoInput.value = '';
        }
    }
});

// Atualização de categorias baseada na empresa selecionada nos formulários
async function popularCategoriasPorEmpresa(empresaId, selectElementId) {
    const selectCategoria = document.getElementById(selectElementId);
    if (!selectCategoria) return;
    selectCategoria.innerHTML = '<option value="">Carregando categorias...</option>';

    if (!empresaId) {
        selectCategoria.innerHTML = '<option value="">Selecione uma empresa primeiro</option>';
        return;
    }
    try {
        const response = await fetch(`/admin/categorias/${empresaId}`);
        if (!response.ok) throw new Error('Erro ao buscar categorias');
        
        const categorias = await response.json();
        if (categorias.length === 0) {
            selectCategoria.innerHTML = '<option value="">Nenhuma categoria para esta empresa</option>';
        } else {
            selectCategoria.innerHTML = categorias.map(cat => 
                `<option value="${cat.id}">${cat.name}</option>`
            ).join('');
        }
    } catch (error) {
        console.error('Erro ao carregar categorias:', error);
        selectCategoria.innerHTML = '<option value="">Erro ao carregar categorias</option>';
    }
}

document.getElementById('produtoEmpresaId')?.addEventListener('change', function(e) {
    popularCategoriasPorEmpresa(this.value, 'produtoCategoriaId');
});


// Submissão dos Formulários
document.getElementById('empresaForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const formData = new FormData(this);
    try {
        const response = await fetch('/admin/empresa', { method: 'POST', body: formData });
        const data = await response.json();
        if (response.ok && data.success) {
            showAdminMessage(data.message || 'Empresa criada com sucesso!');
            this.reset();
            fetchEmpresas(); // Atualiza lista
        } else {
            throw new Error(data.message || data.error || 'Erro ao criar empresa.');
        }
    } catch (error) {
        console.error('Erro ao submeter formulário de empresa:', error);
        showAdminMessage(error.message, 'error');
    }
});

document.getElementById('categoriaForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const formData = new FormData(this);
    const data = Object.fromEntries(formData.entries());
    try {
        const response = await fetch('/admin/categoria', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (response.ok && result.success) {
            showAdminMessage(result.message || 'Categoria criada com sucesso!');
            this.reset();
            fetchCategorias(); // Atualiza lista
        } else {
            throw new Error(result.message || result.error || 'Erro ao criar categoria.');
        }
    } catch (error) {
        console.error('Erro ao submeter formulário de categoria:', error);
        showAdminMessage(error.message, 'error');
    }
});

document.getElementById('produtoForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const formData = new FormData(this);
    // O campo 'images' é para upload de múltiplos arquivos, o backend espera 'images'
    // Se o input for 'produtoImagem', renomeie ou ajuste no backend.
    // Assumindo que o input de imagem no form tem name="images" e é multiple.
    // Se for single, use upload.single('produtoImagem') no backend e o input name="produtoImagem".
    // O código atual do backend usa upload.array('images', 5)

    try {
        const response = await fetch('/admin/produto', { method: 'POST', body: formData });
        const result = await response.json();
        if (response.ok && result.success) {
            showAdminMessage(result.message || 'Produto criado com sucesso!');
            this.reset();
            document.getElementById('descontoGroup').style.display = 'none'; // Esconde campo de desconto
            fetchProdutos(); // Atualiza lista
        } else {
            throw new Error(result.message || result.error || 'Erro ao criar produto.');
        }
    } catch (error) {
        console.error('Erro ao submeter formulário de produto:', error);
        showAdminMessage(error.message, 'error');
    }
});

document.getElementById('roleForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const formData = new FormData(this);
    const data = Object.fromEntries(formData.entries());
    try {
        const response = await fetch('/admin/update-role', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (response.ok && result.success) {
            showAdminMessage(result.message || 'Role atualizada com sucesso!');
            this.reset();
            document.getElementById('userSearchResult').innerHTML = '';
            this.style.display = 'none';
            fetchUsuarios(); // Atualiza lista de usuários
        } else {
            throw new Error(result.message || result.error || 'Erro ao atualizar role.');
        }
    } catch (error) {
        console.error('Erro ao submeter formulário de role:', error);
        showAdminMessage(error.message, 'error');
    }
});


// --- GERENCIAR PEDIDOS ---
async function fetchAdminPedidos(listarTodos = true) {
    const adminPedidosList = document.getElementById('adminPedidosList');
    adminPedidosList.innerHTML = '<p>Carregando pedidos...</p>';
    try {
        let url = '/admin/pedidos';
        if (!listarTodos) {
            const idPesquisa = document.getElementById('idPesquisaPedido').value;
            if (idPesquisa) {
                url += `?pesquisa=${encodeURIComponent(idPesquisa)}`;
            } else {
                // Se não for para listar todos e não houver ID, não faz nada ou exibe mensagem
                adminPedidosList.innerHTML = '<p>Digite um ID para pesquisar ou clique em "Listar Todos".</p>';
                return;
            }
        }
        
        console.log(`Fetching pedidos from: ${url}`);
        const response = await fetch(url);
        
        if (!response.ok) {
            const errorText = await response.text(); // Tenta pegar mais detalhes do erro
            console.error('Erro na resposta do servidor (fetchAdminPedidos):', response.status, errorText);
            throw new Error(`Erro HTTP ${response.status}: ${errorText}`);
        }
        
        const pedidos = await response.json();
        console.log('Pedidos recebidos:', pedidos);
        displayAdminPedidos(pedidos);

    } catch (error) {
        console.error('Erro ao buscar pedidos (admin):', error);
        adminPedidosList.innerHTML = `<p class="error-message">Erro ao carregar pedidos: ${error.message}. Verifique o console do servidor para mais detalhes.</p>`;
    }
}

function pesquisarPedidosAdmin() {
    const idPesquisa = document.getElementById('idPesquisaPedido').value;
    if (!idPesquisa) {
        showAdminMessage('Por favor, insira um ID para pesquisar.', 'error');
        // fetchAdminPedidos(true); // Ou lista todos se o campo estiver vazio
        return;
    }
    fetchAdminPedidos(false); // Passa false para indicar que é uma pesquisa
}


function displayAdminPedidos(pedidos) {
    const container = document.getElementById('adminPedidosList');
    container.innerHTML = '';

    // A rota agora sempre retorna um array, mesmo para busca por ID (com 0 ou 1 elemento)
    if (!pedidos || pedidos.length === 0) {
        container.innerHTML = '<p>Nenhum pedido encontrado.</p>';
        return;
    }
    
    const table = document.createElement('table');
    table.className = 'admin-table'; 
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th>ID</th>
            <th>Usuário</th>
            <th>Empresa</th>
            <th>Itens</th>
            <th>Total</th>
            <th>Status Atual</th>
            <th>Data</th>
            <th>Mudar Status Para</th>
            <th>Ação</th>
        </tr>
    `;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    const orderStatusValues = Object.values(OrderStatus); // Pega os valores do enum OrderStatus

    pedidos.forEach(pedido => {
        const tr = document.createElement('tr');
        
        let itemsHtml = '<ul>';
        if (pedido.orderItems && pedido.orderItems.length > 0) {
            pedido.orderItems.forEach(item => {
                // O backend agora não inclui product em orderItems, usa productName
                itemsHtml += `<li>${item.quantity}x ${item.productName || 'Produto desconhecido'}</li>`;
            });
        } else {
            itemsHtml += '<li>Nenhum item.</li>';
        }
        itemsHtml += '</ul>';

        const selectId = `status-select-${pedido.id}`;
        const buttonId = `update-button-${pedido.id}`;

        tr.innerHTML = `
            <td>${pedido.id}</td>
            <td>${pedido.user ? `${pedido.user.username || 'N/A'} (${pedido.user.email || 'N/A'})` : 'Usuário desconhecido'}</td>
            <td>${pedido.empresa ? pedido.empresa.razaoSocial : 'Empresa desconhecida'}</td>
            <td>${itemsHtml}</td>
            <td>R$ ${parseFloat(pedido.totalAmount).toFixed(2)}</td>
            <td id="current-status-${pedido.id}">${pedido.status.replace(/_/g, ' ')}</td>
            <td>${new Date(pedido.createdAt).toLocaleDateString('pt-BR')}</td>
            <td>
                <div class="custom-select-wrapper">
                    <select id="${selectId}" data-pedido-id="${pedido.id}" class="status-select">
                        ${orderStatusValues.map(statusKey => 
                            `<option value="${statusKey}" ${pedido.status === statusKey ? 'selected' : ''}>
                                ${statusKey.replace(/_/g, ' ')}
                            </option>`
                        ).join('')}
                    </select>
                    <i class="fas fa-chevron-down select-arrow"></i>
                </div>
            </td>
            <td>
                <button id="${buttonId}" onclick="updateAdminPedidoStatus(${pedido.id})" class="btn btn-primary btn-sm">
                    <i class="fas fa-check"></i> Atualizar
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    container.appendChild(table);
}

async function updateAdminPedidoStatus(pedidoId) {
    const statusSelect = document.getElementById(`status-select-${pedidoId}`);
    const newStatus = statusSelect.value;
    const currentStatusDisplay = document.getElementById(`current-status-${pedidoId}`);

    if (!newStatus) {
        showAdminMessage('Por favor, selecione um status válido.', 'error');
        return;
    }

    try {
        const response = await fetch(`/admin/pedidos/${pedidoId}/update-status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Erro HTTP ${response.status}`);
        }

        const data = await response.json();
        if (data.success) {
            // Atualiza o status exibido na interface
            if (currentStatusDisplay) {
                currentStatusDisplay.textContent = newStatus.replace(/_/g, ' ');
            }
            showAdminMessage(`Status do pedido #${pedidoId} atualizado para: ${newStatus.replace(/_/g, ' ')}`);
        } else {
            throw new Error(data.message || 'Erro não especificado ao atualizar status.');
        }
    } catch (error) {
        console.error('Erro ao atualizar status do pedido:', error);
        showAdminMessage(`Erro ao atualizar status: ${error.message}`, 'error');
    }
}

// Função para testar a conexão com a rota Admin Ping
async function testarPingAdmin() {
    const adminPedidosList = document.getElementById('adminPedidosList');
    adminPedidosList.innerHTML = '<p>Testando conexão com o servidor...</p>';
    
    try {
        const response = await fetch('/admin/ping');
        const data = await response.json();
        adminPedidosList.innerHTML = `<p class="success-message">Conexão com o servidor bem-sucedida: ${data.message}</p>`;
    } catch (error) {
        console.error('Erro ao testar ping admin:', error);
        adminPedidosList.innerHTML = `<p class="error-message">Erro na conexão com o servidor: ${error.message}</p>`;
    }
}

// Adicionar inicialização automática
document.addEventListener('DOMContentLoaded', function() {
    // Verificar se estamos na página de admin pelo título ou outro elemento específico
    const adminTitle = document.querySelector('h1');
    if (adminTitle && adminTitle.textContent.includes('Painel Administrativo')) {
        console.log('Página de admin detectada, carregando dados iniciais...');
        // Carregar dados iniciais
        const listButtons = document.querySelectorAll('.list-button');
        if (listButtons.length) {
            console.log('Botões de listagem encontrados');
        } else {
            console.log('Botões de listagem não encontrados, carregando dados automaticamente');
            setTimeout(() => {
                fetchEmpresas();
                fetchCategorias();
                fetchProdutos();
                fetchUsuarios();
            }, 500);
        }
    }
});