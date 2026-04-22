import type { XmppAccount, XmppSession, XmppStatus } from "@chat/shared";
import type { AuthSession } from "../../lib/auth.js";
import { HttpError } from "../../lib/http.js";

export type XmppRuntimeConfig = {
  xmppAdminJid: string | undefined;
  xmppAdminPort: number;
  xmppApiBaseUrl: string | undefined;
  xmppApiPass: string | undefined;
  xmppApiUser: string | undefined;
  xmppClientPort: number;
  xmppComposeProfile: string;
  xmppDomain: string | undefined;
  xmppEnabled: boolean;
  xmppFederationEnabled: boolean;
  xmppFederationPort: number;
  xmppHost: string | undefined;
  xmppUserProvisioningEnabled: boolean;
  xmppUserProvisioningStrict: boolean;
};

type FetchLike = typeof fetch;
type EjabberdCommandResponse = number | string | boolean | null | Array<Record<string, unknown>> | Record<string, unknown>;

const sampleSessionLimit = 6;

const normalizeSession = (payload: Record<string, unknown>): XmppSession => ({
  jid: String(payload.jid ?? ""),
  connection: String(payload.connection ?? "c2s"),
  ip: String(payload.ip ?? "unknown"),
  node: String(payload.node ?? "unknown"),
  port: Number(payload.port ?? 0),
  priority: Number(payload.priority ?? 0),
  resource: String(payload.resource ?? ""),
  status: String(payload.status ?? "available"),
  statustext: String(payload.statustext ?? ""),
  uptime: Number(payload.uptime ?? 0)
});

const commandUrl = (baseUrl: string, command: string) => `${baseUrl.replace(/\/+$/, "")}/${command}`;

const isXmppApiConfigured = (runtime: XmppRuntimeConfig) => (
  Boolean(runtime.xmppApiBaseUrl && runtime.xmppApiUser && runtime.xmppApiPass)
);

const isXmppProvisioningEnabled = (runtime: XmppRuntimeConfig) => (
  runtime.xmppEnabled && runtime.xmppUserProvisioningEnabled
);

const assertXmppProvisioningReady = (runtime: XmppRuntimeConfig) => {
  if (!runtime.xmppEnabled) {
    throw new Error("XMPP is disabled in this app environment");
  }
  if (!runtime.xmppUserProvisioningEnabled) {
    throw new Error("App-managed XMPP provisioning is disabled");
  }
  if (!runtime.xmppDomain) {
    throw new Error("XMPP_DOMAIN is required for app-managed XMPP provisioning");
  }
  if (!runtime.xmppApiBaseUrl || !runtime.xmppApiUser || !runtime.xmppApiPass) {
    throw new Error("XMPP_API_BASE_URL, XMPP_API_USER, and XMPP_API_PASS are required for app-managed XMPP provisioning");
  }
};

const buildXmppJid = (runtime: XmppRuntimeConfig, username: string) => (
  runtime.xmppDomain ? `${username}@${runtime.xmppDomain}` : null
);

const normalizeCommandResponse = async (response: Response): Promise<EjabberdCommandResponse> => {
  const body = await response.text();
  if (!body) {
    return "";
  }

  try {
    return JSON.parse(body) as EjabberdCommandResponse;
  } catch {
    return body;
  }
};

const callCommand = async (
  runtime: XmppRuntimeConfig,
  fetchImpl: FetchLike,
  command: string,
  payload: Record<string, string | number | boolean> = {}
): Promise<EjabberdCommandResponse> => {
  if (!runtime.xmppApiBaseUrl || !runtime.xmppApiUser || !runtime.xmppApiPass) {
    throw new Error("Missing XMPP API configuration");
  }

  const response = await fetchImpl(commandUrl(runtime.xmppApiBaseUrl, command), {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${runtime.xmppApiUser}:${runtime.xmppApiPass}`).toString("base64")}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const parsed = await normalizeCommandResponse(response);

  if (!response.ok) {
    const detail = typeof parsed === "string" ? parsed : JSON.stringify(parsed);
    throw new Error(`${command} failed: ${response.status} ${detail || response.statusText}`);
  }

  return parsed;
};

const commandSucceeded = (payload: EjabberdCommandResponse) => {
  if (typeof payload === "number") {
    return payload === 0;
  }
  if (typeof payload === "boolean") {
    return payload;
  }
  if (typeof payload === "string") {
    const normalized = payload.trim().toLowerCase();
    return normalized === "" || normalized === "0" || normalized === "success" || normalized === "\"\"";
  }
  return false;
};

const assertCommandSucceeded = (command: string, payload: EjabberdCommandResponse) => {
  if (commandSucceeded(payload)) {
    return;
  }

  const detail = typeof payload === "string" ? payload : JSON.stringify(payload);
  throw new Error(`${command} failed: ${detail || "unexpected ejabberd response"}`);
};

const checkXmppAccount = async (
  runtime: XmppRuntimeConfig,
  username: string,
  fetchImpl: FetchLike
) => {
  assertXmppProvisioningReady(runtime);

  const payload = await callCommand(runtime, fetchImpl, "check_account", {
    user: username,
    host: runtime.xmppDomain!
  });

  return commandSucceeded(payload);
};

const buildWarnings = (runtime: XmppRuntimeConfig) => {
  const warnings: string[] = [];
  if (!runtime.xmppEnabled) {
    warnings.push("XMPP thin slice is disabled. Enable XMPP_ENABLED and start ejabberd to expose client connectivity.");
  }
  if (!runtime.xmppApiBaseUrl || !runtime.xmppApiUser || !runtime.xmppApiPass) {
    warnings.push("Live XMPP metrics need XMPP_API_BASE_URL, XMPP_API_USER, and XMPP_API_PASS.");
  }
  if (!runtime.xmppFederationEnabled) {
    warnings.push("Federation stays off in this thin slice. Single-server client connectivity ships first.");
  }
  if (runtime.xmppEnabled && !runtime.xmppUserProvisioningEnabled) {
    warnings.push("App-managed XMPP accounts are off. Enable XMPP_USER_PROVISIONING_ENABLED to mirror app users into ejabberd.");
  }

  return warnings;
};

const buildAccountWarnings = (runtime: XmppRuntimeConfig) => {
  const warnings: string[] = [];

  if (!runtime.xmppEnabled) {
    warnings.push("XMPP is disabled in this app environment.");
    return warnings;
  }

  if (!runtime.xmppUserProvisioningEnabled) {
    warnings.push("App-managed XMPP accounts are disabled.");
  }
  if (!runtime.xmppDomain) {
    warnings.push("XMPP_DOMAIN is not configured.");
  }
  if (!runtime.xmppHost && !runtime.xmppDomain) {
    warnings.push("XMPP_HOST or XMPP_DOMAIN is required for client setup.");
  }
  if (!isXmppApiConfigured(runtime)) {
    warnings.push("XMPP API credentials are required to verify or repair user accounts.");
  }

  return warnings;
};

const buildTestCommands = (runtime: XmppRuntimeConfig) => {
  const domain = runtime.xmppDomain ?? "localhost";
  const host = runtime.xmppHost ?? domain;

  return [
    `docker compose --profile ${runtime.xmppComposeProfile} up -d xmpp`,
    `./ops/scripts/xmpp-register-user.sh alice ${domain} replace-me`,
    `./ops/scripts/xmpp-register-user.sh bob ${domain} replace-me`,
    `./ops/scripts/xmpp-link-users.sh alice bob ${domain}`,
    `Connect a Jabber client to ${host}:${runtime.xmppClientPort} and log in as alice@${domain}.`
  ];
};

const buildBaseStatus = (runtime: XmppRuntimeConfig): XmppStatus => ({
  adminJid: runtime.xmppAdminJid ?? null,
  adminUrl: runtime.xmppHost ? `http://${runtime.xmppHost}:${runtime.xmppAdminPort}/admin` : null,
  clientHost: runtime.xmppHost ?? runtime.xmppDomain ?? null,
  composeProfile: runtime.xmppComposeProfile,
  domain: runtime.xmppDomain ?? null,
  enabled: runtime.xmppEnabled,
  federation: {
    enabled: runtime.xmppFederationEnabled,
    hostname: runtime.xmppHost ?? runtime.xmppDomain ?? null,
    mode: !runtime.xmppEnabled ? "disabled" : runtime.xmppFederationEnabled ? "federation-ready" : "single-server",
    port: runtime.xmppFederationPort
  },
  lastError: null,
  metrics: {
    connectedUsers: null,
    fetchedAt: null,
    incomingS2S: null,
    outgoingS2S: null,
    sampleSessions: []
  },
  ports: {
    admin: runtime.xmppAdminPort,
    client: runtime.xmppClientPort,
    federation: runtime.xmppFederationPort
  },
  testCommands: buildTestCommands(runtime),
  warnings: buildWarnings(runtime)
});

export const buildXmppAccount = async (
  runtime: XmppRuntimeConfig,
  username: string,
  fetchImpl: FetchLike = fetch
): Promise<XmppAccount> => {
  const account: XmppAccount = {
    clientHost: runtime.xmppHost ?? runtime.xmppDomain ?? null,
    domain: runtime.xmppDomain ?? null,
    enabled: runtime.xmppEnabled,
    exists: null,
    jid: buildXmppJid(runtime, username),
    lastError: null,
    passwordManaged: isXmppProvisioningEnabled(runtime),
    ports: {
      client: runtime.xmppClientPort
    },
    provisioningEnabled: runtime.xmppUserProvisioningEnabled,
    warnings: buildAccountWarnings(runtime)
  };

  if (!isXmppProvisioningEnabled(runtime) || !runtime.xmppDomain || !isXmppApiConfigured(runtime)) {
    return account;
  }

  try {
    account.exists = await checkXmppAccount(runtime, username, fetchImpl);
  } catch (error) {
    account.lastError = error instanceof Error ? error.message : "Unknown XMPP account lookup failure";
    account.warnings = [...account.warnings, "Could not verify the current XMPP account state."];
  }

  return account;
};

export const upsertXmppUser = async (
  runtime: XmppRuntimeConfig,
  username: string,
  password: string,
  fetchImpl: FetchLike = fetch
) => {
  if (!isXmppProvisioningEnabled(runtime)) {
    return { created: false, skipped: true };
  }

  const exists = await checkXmppAccount(runtime, username, fetchImpl);
  const command = exists ? "change_password" : "register";
  const payload = await callCommand(runtime, fetchImpl, command, exists
    ? { user: username, host: runtime.xmppDomain!, newpass: password }
    : { user: username, host: runtime.xmppDomain!, password });

  assertCommandSucceeded(command, payload);
  return {
    created: !exists,
    skipped: false
  };
};

export const removeXmppUser = async (
  runtime: XmppRuntimeConfig,
  username: string,
  fetchImpl: FetchLike = fetch
) => {
  if (!isXmppProvisioningEnabled(runtime)) {
    return { removed: false, skipped: true };
  }

  const exists = await checkXmppAccount(runtime, username, fetchImpl);
  if (!exists) {
    return { removed: false, skipped: false };
  }

  const payload = await callCommand(runtime, fetchImpl, "unregister", {
    user: username,
    host: runtime.xmppDomain!
  });

  assertCommandSucceeded("unregister", payload);
  return {
    removed: true,
    skipped: false
  };
};

export const linkXmppUsers = async (
  runtime: XmppRuntimeConfig,
  leftUsername: string,
  rightUsername: string,
  fetchImpl: FetchLike = fetch
) => {
  if (!isXmppProvisioningEnabled(runtime) || leftUsername === rightUsername) {
    return { skipped: true };
  }

  assertXmppProvisioningReady(runtime);

  const first = await callCommand(runtime, fetchImpl, "add_rosteritem", {
    localuser: leftUsername,
    localhost: runtime.xmppDomain!,
    user: rightUsername,
    host: runtime.xmppDomain!,
    nick: rightUsername,
    groups: "Contacts",
    subs: "both"
  });
  assertCommandSucceeded("add_rosteritem", first);

  const second = await callCommand(runtime, fetchImpl, "add_rosteritem", {
    localuser: rightUsername,
    localhost: runtime.xmppDomain!,
    user: leftUsername,
    host: runtime.xmppDomain!,
    nick: leftUsername,
    groups: "Contacts",
    subs: "both"
  });
  assertCommandSucceeded("add_rosteritem", second);

  return { skipped: false };
};

export const unlinkXmppUsers = async (
  runtime: XmppRuntimeConfig,
  leftUsername: string,
  rightUsername: string,
  fetchImpl: FetchLike = fetch
) => {
  if (!isXmppProvisioningEnabled(runtime) || leftUsername === rightUsername) {
    return { skipped: true };
  }

  assertXmppProvisioningReady(runtime);

  const first = await callCommand(runtime, fetchImpl, "delete_rosteritem", {
    localuser: leftUsername,
    localhost: runtime.xmppDomain!,
    user: rightUsername,
    host: runtime.xmppDomain!
  });
  assertCommandSucceeded("delete_rosteritem", first);

  const second = await callCommand(runtime, fetchImpl, "delete_rosteritem", {
    localuser: rightUsername,
    localhost: runtime.xmppDomain!,
    user: leftUsername,
    host: runtime.xmppDomain!
  });
  assertCommandSucceeded("delete_rosteritem", second);

  return { skipped: false };
};

export const provisionXmppAccountForUser = async (
  runtime: XmppRuntimeConfig,
  auth: AuthSession,
  currentPassword: string,
  fetchImpl: FetchLike = fetch
) => {
  const [{ eq }, { db }, { users }, { verifyPassword }] = await Promise.all([
    import("drizzle-orm"),
    import("../../db/client.js"),
    import("../../db/schema.js"),
    import("../../lib/auth.js")
  ]);

  if (!runtime.xmppEnabled) {
    throw new HttpError(409, "XMPP is disabled in this app environment");
  }
  if (!runtime.xmppUserProvisioningEnabled) {
    throw new HttpError(409, "App-managed XMPP provisioning is disabled");
  }

  const [user] = await db.select({
    id: users.id,
    passwordHash: users.passwordHash,
    username: users.username
  }).from(users).where(eq(users.id, auth.user.id));

  if (!user) {
    throw new HttpError(404, "User not found");
  }

  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) {
    throw new HttpError(400, "Current password is incorrect");
  }

  await upsertXmppUser(runtime, user.username, currentPassword, fetchImpl);
  return buildXmppAccount(runtime, user.username, fetchImpl);
};

export const buildXmppStatus = async (
  runtime: XmppRuntimeConfig,
  fetchImpl: FetchLike = fetch
): Promise<XmppStatus> => {
  const status = buildBaseStatus(runtime);

  if (!runtime.xmppEnabled || !isXmppApiConfigured(runtime)) {
    return status;
  }

  try {
    const [connectedUsers, incomingS2S, outgoingS2S, sessions] = await Promise.all([
      callCommand(runtime, fetchImpl, "connected_users_number"),
      callCommand(runtime, fetchImpl, "incoming_s2s_number"),
      callCommand(runtime, fetchImpl, "outgoing_s2s_number"),
      callCommand(runtime, fetchImpl, "connected_users_info")
    ]);

    status.metrics = {
      connectedUsers: typeof connectedUsers === "number" ? connectedUsers : Number(connectedUsers),
      fetchedAt: new Date().toISOString(),
      incomingS2S: typeof incomingS2S === "number" ? incomingS2S : Number(incomingS2S),
      outgoingS2S: typeof outgoingS2S === "number" ? outgoingS2S : Number(outgoingS2S),
      sampleSessions: Array.isArray(sessions)
        ? sessions.slice(0, sampleSessionLimit).map((item) => normalizeSession(item))
        : []
    };
  } catch (error) {
    status.lastError = error instanceof Error ? error.message : "Unknown XMPP API failure";
    status.warnings = [...status.warnings, "XMPP service is configured, but live metrics fetch failed."];
  }

  return status;
};
