// /js/password-toggle.js
document.addEventListener('DOMContentLoaded', function() {
    const togglePasswordIcons = document.querySelectorAll('.toggle-password-icon');

    togglePasswordIcons.forEach(icon => {
        icon.addEventListener('click', function() {
            const targetInputId = this.dataset.target;
            const passwordInput = document.getElementById(targetInputId);

            if (passwordInput) {
                if (passwordInput.type === 'password') {
                    passwordInput.type = 'text';
                    this.innerHTML = 'visibility_off';
                    this.setAttribute('title', 'Ocultar senha');
                } else {
                    passwordInput.type = 'password';
                    this.innerHTML = 'visibility';
                    this.setAttribute('title', 'Mostrar senha');
                }
            }
        });
    });
});