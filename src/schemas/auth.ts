import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().min(1, 'Informe seu e-mail.').email('E-mail inválido.'),
  password: z.string().min(8, 'Senha deve ter ao menos 8 caracteres.'),
});

export const RegisterSchema = z.object({
  name: z.string().min(2, 'Informe seu nome completo.'),
  email: z.string().min(1, 'Informe seu e-mail.').email('E-mail inválido.'),
  password: z.string().min(8, 'Senha deve ter ao menos 8 caracteres.'),
  confirmPassword: z.string().min(1, 'Confirme sua senha.'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem.',
  path: ['confirmPassword'],
});

export type LoginInput = z.infer<typeof LoginSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
