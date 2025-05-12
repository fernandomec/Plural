function logout() {
    fetch('/logout', {
        method: 'POST',
        credentials: 'same-origin'
    })
    .then(response => {
        if (response.ok) {
            alert('Logout realizado com sucesso!');
            window.location.href = '/';
        }
    })
    .catch(error => {
        console.error('Erro no logout:', error);
    });
}