import { z } from 'zod';

// Form-side input schemas — for use with @hookform/resolvers/zod (web) or
// inline validation in mobile login screens. Keeps password rules + email
// shape consistent across both apps.

export const emailSchema = z.string().email({ message: 'Enter a valid email' });

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long');

export const loginFormSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});
export type LoginFormValues = z.infer<typeof loginFormSchema>;

export const signupFormSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  display_name: z.string().min(1, 'Name is required').max(80).optional(),
});
export type SignupFormValues = z.infer<typeof signupFormSchema>;

export const resetPasswordFormSchema = z.object({
  email: emailSchema,
});
export type ResetPasswordFormValues = z.infer<typeof resetPasswordFormSchema>;
