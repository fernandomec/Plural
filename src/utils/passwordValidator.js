const validatePassword = (password) => {
    const minLength = 8;
    const maxLength = 20;
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*]/.test(password);
    
    if (password.length < minLength || password.length > maxLength) {
        return {
            isValid: false,
            message: `A senha deve ter entre ${minLength} e ${maxLength} caracteres`
        };
    }
    
    if (!hasNumber) {
        return {
            isValid: false,
            message: 'A senha deve conter pelo menos um número'
        };
    }
    
    if (!hasSpecialChar) {
        return {
            isValid: false,
            message: 'A senha deve conter pelo menos um caractere especial (!@#$%^&*)'
        };
    }

    return {
        isValid: true,
        message: 'Senha válida'
    };
};

module.exports = validatePassword;
