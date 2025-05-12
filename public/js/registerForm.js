document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const errorDiv = document.getElementById('errorMessage');
    const successDiv = document.getElementById('successMessage');
    
    errorDiv.classList.add('hidden');
    successDiv.classList.add('hidden');

    try {
        const response = await fetch('/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: document.getElementById('email').value,
                username: document.getElementById('username').value,
                password: document.getElementById('password').value
            })
        });

        const data = await response.json();

        if (!response.ok) {
            errorDiv.textContent = data.message;
            errorDiv.classList.remove('hidden');
            return;
        }

        successDiv.textContent = data.message;
        successDiv.classList.remove('hidden');

        // Redireciona para login após 2 segundos
        setTimeout(() => {
            window.location.href = '/login';
        }, 2000);

    } catch (error) {
        errorDiv.textContent = 'Erro ao conectar com o servidor';
        errorDiv.classList.remove('hidden');
    }
});
