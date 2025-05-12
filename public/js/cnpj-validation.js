document.addEventListener('DOMContentLoaded', () => {
    const cnpjInput = document.getElementById('cnpj');
    const form = document.getElementById('empresaForm');
    
    function formatarCNPJ(valor) {
        valor = valor.replace(/\D/g, '');
        if (valor.length > 12) {
            valor = valor.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
        }
        return valor.substr(0, 18);
    }

    function validarCNPJ(cnpj) {
        const formatoValido = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(cnpj);
        const quantidadeNumerosValida = cnpj.replace(/\D/g, '').length === 14;
        return formatoValido && quantidadeNumerosValida;
    }

    cnpjInput.addEventListener('input', (e) => {
        const elementosRequisitos = document.querySelectorAll('.cnpj-requirements .requirement');
        const cnpj = e.target.value;
        
        e.target.value = formatarCNPJ(cnpj);
        
        if (cnpj === '') {
            elementosRequisitos.forEach(el => el.style.display = 'none');
            return;
        } else {
            elementosRequisitos.forEach(el => el.style.display = 'block');
        }

        const temQuatorzeNumeros = cnpj.replace(/\D/g, '').length === 14;
        const formatoCorreto = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(cnpj);

        elementosRequisitos[0].classList.toggle('valid', temQuatorzeNumeros);
        elementosRequisitos[0].classList.toggle('invalid', !temQuatorzeNumeros);

        elementosRequisitos[1].classList.toggle('valid', formatoCorreto);
        elementosRequisitos[1].classList.toggle('invalid', !formatoCorreto);
    });

    form.addEventListener('submit', (e) => {
        const cnpj = cnpjInput.value;
        
        if (cnpj === '') {
            return true;
        }

        if (!validarCNPJ(cnpj)) {
            e.preventDefault();
            alert('Por favor, insira um CNPJ válido');
            return false;
        }
    });

    document.querySelectorAll('.cnpj-requirements .requirement').forEach(el => 
        el.style.display = 'none'
    );
});
