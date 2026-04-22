import type { XmppSession, XmppStatus } from "@chat/shared";

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
};

type FetchLike = typeof fetch;

type EjabberdCommandResponse = number | string | Array<Record<string, unknown>>;

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

  return warnings;
};

const buildTestCommands = (runtime: XmppRuntimeConfig) => {
  const domain = runtime.xmppDomain ?? "localhost";
  const host = runtime.xmppHost ?? domain;

  return [
    `docker compose --profile ${runtime.xmppComposeProfile} up -d xmpp`,
    `./ops/scripts/xmpp-register-user.sh alice ${domain} replace-me`,
    `./ops/scripts/xmpp-register-user.sh bob ${domain} replace-me`,
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

const callCommand = async (
  runtime: XmppRuntimeConfig,
  fetchImpl: FetchLike,
  command: string
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
    body: "{}"
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${command} failed: ${response.status} ${body || response.statusText}`);
  }

  return response.json() as Promise<EjabberdCommandResponse>;
};

export const buildXmppStatus = async (
  runtime: XmppRuntimeConfig,
  fetchImpl: FetchLike = fetch
): Promise<XmppStatus> => {
  const status = buildBaseStatus(runtime);

  if (!runtime.xmppEnabled || !runtime.xmppApiBaseUrl || !runtime.xmppApiUser || !runtime.xmppApiPass) {
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
