document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const errorDiv = document.getElementById('errorMessage');
    const successDiv = document.getElementById('successMessage');
    
    errorDiv.classList.add('hidden');
    successDiv.classList.add('hidden');

    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: document.getElementById('email').value,
                password: document.getElementById('password').value
            })
        });

        const data = await response.json();

        if (!response.ok) {
            errorDiv.textContent = data.message;
            errorDiv.classList.remove('hidden');
            return;
        }

        successDiv.textContent = 'Login realizado com sucesso!';
        successDiv.classList.remove('hidden');

        setTimeout(() => {
            window.location.href = '/user';
        }, 1000);

    } catch (error) {
        errorDiv.textContent = 'Erro ao conectar com o servidor';
        errorDiv.classList.remove('hidden');
    }
});