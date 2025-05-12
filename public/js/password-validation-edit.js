document.addEventListener('DOMContentLoaded', () => {
    const inputSenha = document.getElementById('newPassword');
    const form = document.getElementById('editForm');
    const requisitos = [
        { regex: /^.{8,20}$/, index: 0 }, // 8-20 caracteres
        { regex: /[0-9]/, index: 1 }, // número
        { regex: /[!@#$%^&*]/, index: 2 } // caractere especial
    ];

    function atualizarRequisito(elemento, valido) {
        elemento.classList.remove(valido ? 'invalid' : 'valid');
        elemento.classList.add(valido ? 'valid' : 'invalid');
    }

    function validarSenha(senha) {
        return requisitos.every(req => req.regex.test(senha));
    }

    inputSenha.addEventListener('input', () => {
        const senha = inputSenha.value;
        const elementosRequisitos = document.querySelectorAll('.requirement');

        if (senha === '') {
            elementosRequisitos.forEach(el => el.style.display = 'none');
            return;
        } else {
            elementosRequisitos.forEach(el => el.style.display = 'block');
        }

        const tamanhoValido = senha.length >= 8 && senha.length <= 20;
        atualizarRequisito(elementosRequisitos[0], tamanhoValido);

        requisitos.slice(1).forEach((requisito, i) => {
            const valido = requisito.regex.test(senha);
            atualizarRequisito(elementosRequisitos[i + 1], valido);
        });
    });

    form.addEventListener('submit', (e) => {
        const senha = inputSenha.value;
        
        //se o campo de nova senha estiver vazio, permite o envio
        if (senha === '') {
            return true;
        }

        //impede o envio
        if (!validarSenha(senha)) {
            e.preventDefault();
            alert('A nova senha não atende aos requisitos de segurança');
            return false;
        }
    });

    document.querySelectorAll('.requirement').forEach(el => el.style.display = 'none');
});
