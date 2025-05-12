document.addEventListener('DOMContentLoaded', () => {
    const inputSenha = document.getElementById('password');
    const requisitos = [
        { regex: /^.{8,20}$/, index: 0 }, // 8-20caracteres
        { regex: /[0-9]/, index: 1 }, //número
        { regex: /[!@#$%^&*]/, index: 2 } //caractere especial
    ];

    function atualizarRequisito(elemento, valido) {
        elemento.classList.remove(valido ? 'invalid' : 'valid');
        elemento.classList.add(valido ? 'valid' : 'invalid');
    }

    inputSenha.addEventListener('input', () => {
        const senha = inputSenha.value;
        const elementosRequisitos = document.querySelectorAll('.requirement');

        const tamanhoValido = senha.length >= 8 && senha.length <= 20;
        atualizarRequisito(elementosRequisitos[0], tamanhoValido);

        requisitos.slice(1).forEach((requisito, i) => {
            const valido = requisito.regex.test(senha);
            atualizarRequisito(elementosRequisitos[i + 1], valido);
        });
    });
});
