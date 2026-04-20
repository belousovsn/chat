import { z } from "zod";

export const registerInputSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(24).regex(/^[a-zA-Z0-9_.-]+$/),
  password: z.string().min(8).max(72)
});

export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72)
});

export const forgotPasswordInputSchema = z.object({
  email: z.string().email()
});

export const resetPasswordInputSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8).max(72)
});

export const changePasswordInputSchema = z.object({
  currentPassword: z.string().min(8).max(72),
  newPassword: z.string().min(8).max(72)
});

export const revokeSessionInputSchema = z.object({
  sessionId: z.string().uuid()
});

export const activeSessionSchema = z.object({
  id: z.string().uuid(),
  userAgent: z.string(),
  ipAddress: z.string(),
  isCurrent: z.boolean(),
  createdAt: z.string(),
  lastSeenAt: z.string()
});

export const authUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  username: z.string(),
  presence: z.enum(["online", "afk", "offline"]),
  createdAt: z.string()
});

export const authSessionSchema = z.object({
  user: authUserSchema,
  sessions: z.array(activeSessionSchema)
});

export type RegisterInput = z.infer<typeof registerInputSchema>;
export type LoginInput = z.infer<typeof loginInputSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordInputSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordInputSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordInputSchema>;
export type RevokeSessionInput = z.infer<typeof revokeSessionInputSchema>;
export type ActiveSession = z.infer<typeof activeSessionSchema>;
export type AuthUser = z.infer<typeof authUserSchema>;
export type AuthSession = z.infer<typeof authSessionSchema>;
