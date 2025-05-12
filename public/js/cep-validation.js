document.addEventListener('DOMContentLoaded', () => {
    const cepInput = document.getElementById('cep');
    const form = document.getElementById('editForm');
    const requisitos = [
        { regex: /^\d{8}$/, index: 0 }, // 8 números (removendo o hífen)
        { regex: /^\d{5}-\d{3}$/, index: 1 } // formato XXXXX-XXX
    ];

    function atualizarRequisito(elemento, valido) {
        elemento.classList.remove(valido ? 'invalid' : 'valid');
        elemento.classList.add(valido ? 'valid' : 'invalid');
    }

    function validarCEP(cep) {

        const formatoValido = /^\d{5}-\d{3}$/.test(cep);
        const quantidadeNumerosValida = cep.replace('-', '').length === 8;
        
        return formatoValido && quantidadeNumerosValida;
    }

    function formatarCEP(valor) {
        valor = valor.replace(/\D/g, '');
        if (valor.length > 5) {
            valor = valor.substr(0, 5) + '-' + valor.substr(5);
        }
        return valor.substr(0, 9);//limita a 9 caracteres (5 + hífen + 3)
    }

    cepInput.addEventListener('input', (e) => {
        const elementosRequisitos = document.querySelectorAll('.cep-requirements .requirement');
        const cep = e.target.value;
        
        e.target.value = formatarCEP(cep);
        
        if (cep === '') {
            elementosRequisitos.forEach(el => el.style.display = 'none');
            return;
        } else {
            elementosRequisitos.forEach(el => el.style.display = 'block');
        }

        //verifica quantidade de números
        const temOitoNumeros = cep.replace(/\D/g, '').length === 8;
        atualizarRequisito(elementosRequisitos[0], temOitoNumeros);
    });

    form.addEventListener('submit', (e) => {
        const cep = cepInput.value;
        
        if (cep === '') {
            return true;
        }

        if (!validarCEP(cep)) {
            e.preventDefault();
            alert('Por favor, insira um CEP válido');
            return false;
        }
    });

    document.querySelectorAll('.cep-requirements .requirement').forEach(el => el.style.display = 'none');
});
