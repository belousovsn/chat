import { z } from "zod";

export const xmppSessionSchema = z.object({
  jid: z.string(),
  connection: z.string(),
  ip: z.string(),
  node: z.string(),
  port: z.number().int().nonnegative(),
  priority: z.number().int(),
  resource: z.string(),
  status: z.string(),
  statustext: z.string(),
  uptime: z.number().int().nonnegative()
});

export const xmppStatusSchema = z.object({
  adminJid: z.string().nullable(),
  adminUrl: z.string().nullable(),
  clientHost: z.string().nullable(),
  composeProfile: z.string(),
  domain: z.string().nullable(),
  enabled: z.boolean(),
  federation: z.object({
    enabled: z.boolean(),
    hostname: z.string().nullable(),
    mode: z.enum(["disabled", "single-server", "federation-ready"]),
    port: z.number().int().nonnegative()
  }),
  lastError: z.string().nullable(),
  metrics: z.object({
    connectedUsers: z.number().int().nonnegative().nullable(),
    fetchedAt: z.string().nullable(),
    incomingS2S: z.number().int().nonnegative().nullable(),
    outgoingS2S: z.number().int().nonnegative().nullable(),
    sampleSessions: z.array(xmppSessionSchema)
  }),
  ports: z.object({
    admin: z.number().int().nonnegative(),
    client: z.number().int().nonnegative(),
    federation: z.number().int().nonnegative()
  }),
  testCommands: z.array(z.string()),
  warnings: z.array(z.string())
});

export type XmppSession = z.infer<typeof xmppSessionSchema>;
export type XmppStatus = z.infer<typeof xmppStatusSchema>;
