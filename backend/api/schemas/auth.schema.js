const { z } = require('zod');

const loginSchema = z.object({
    body: z.object({
        email: z.string().min(1, { message: "Email o usuario obligatorio" }),
        password: z.string().min(1, { message: "La contraseña es obligatoria" }),
    }),
});

const registerSchema = z.object({
    body: z.object({
        nombre: z.string().min(1, { message: "El nombre es obligatorio" }),
        email: z.string().email({ message: "Email inválido" }),
        password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres" }),
    }),
});

module.exports = {
    loginSchema,
    registerSchema,
};
