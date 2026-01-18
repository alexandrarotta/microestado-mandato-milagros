import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export const saveSchema = z.object({
  state: z.unknown(),
  updatedAt: z.string().optional(),
  version: z.string().optional()
});

export const telemetrySchema = z.object({
  eventName: z.string().min(1),
  payload: z.unknown().optional()
});

export const countrySchema = z.object({
  baseName: z.string().min(1).max(80),
  stateTypeId: z.string().min(1).max(40),
  stateTypeOtherText: z.string().max(60).optional(),
  formalName: z.string().min(1).max(120),
  geography: z.string().min(2).max(30).optional(),
  motto: z.string().max(80).optional(),
  demonym: z.string().max(60).optional()
});

export const profileUpdateSchema = z.object({
  displayName: z.string().min(2).max(40).optional(),
  leaderName: z.string().min(2).max(40).optional(),
  pronouns: z.string().min(2).max(40).optional()
});

export const profilePatchSchema = z.object({
  displayName: z.string().min(2).max(40).optional(),
  motto: z.string().max(80).optional(),
  addMedal: z.string().min(1).max(60).optional()
});
