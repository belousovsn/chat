const requireValue = (name: string, fallback?: string) => {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing environment variable ${name}`);
  }
  return value;
};

const optionalValue = (name: string) => {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
};

const optionalList = (name: string) => {
  const value = process.env[name];
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const parseBoolean = (name: string, fallback: boolean) => {
  const value = process.env[name];
  if (value === undefined) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  throw new Error(`Invalid boolean environment variable ${name}=${value}`);
};

const smtpUser = optionalValue("SMTP_USER");
const smtpPass = optionalValue("SMTP_PASS");
const xmppApiUser = optionalValue("XMPP_API_USER");
const xmppApiPass = optionalValue("XMPP_API_PASS");
const assistantApiKey = optionalValue("ASSISTANT_API_KEY");
const assistantEnabled = parseBoolean("ASSISTANT_ENABLED", Boolean(assistantApiKey));

if ((smtpUser && !smtpPass) || (!smtpUser && smtpPass)) {
  throw new Error("SMTP_USER and SMTP_PASS must either both be set or both be empty");
}

if ((xmppApiUser && !xmppApiPass) || (!xmppApiUser && xmppApiPass)) {
  throw new Error("XMPP_API_USER and XMPP_API_PASS must either both be set or both be empty");
}

if (assistantEnabled && !assistantApiKey) {
  throw new Error("ASSISTANT_API_KEY is required when ASSISTANT_ENABLED=true");
}

export const config = {
  appHost: requireValue("APP_HOST", "0.0.0.0"),
  appPort: Number(requireValue("APP_PORT", "8080")),
  appUrl: requireValue("APP_URL", "http://localhost:8080"),
  databaseUrl: requireValue("DATABASE_URL"),
  sessionSecret: requireValue("SESSION_SECRET"),
  mailFrom: requireValue("MAIL_FROM", "noreply@classic-chat.local"),
  smtpHost: requireValue("SMTP_HOST", "mailpit"),
  smtpPort: Number(requireValue("SMTP_PORT", "1025")),
  smtpSecure: parseBoolean("SMTP_SECURE", false),
  smtpUser,
  smtpPass,
  uploadDir: requireValue("UPLOAD_DIR", "uploads"),
  maxFileBytes: Number(requireValue("MAX_FILE_BYTES", String(20 * 1024 * 1024))),
  maxImageBytes: Number(requireValue("MAX_IMAGE_BYTES", String(3 * 1024 * 1024))),
  assistantEnabled,
  assistantUsername: requireValue("ASSISTANT_USERNAME", "assistant"),
  assistantEmail: requireValue("ASSISTANT_EMAIL", "assistant@classic-chat.local"),
  assistantApiKey,
  assistantApiBaseUrl: requireValue("ASSISTANT_API_BASE_URL", "https://api.x.ai/v1"),
  assistantModel: requireValue("ASSISTANT_MODEL", "grok-3"),
  xmppEnabled: parseBoolean("XMPP_ENABLED", false),
  xmppDomain: optionalValue("XMPP_DOMAIN"),
  xmppHost: optionalValue("XMPP_HOST") ?? optionalValue("XMPP_DOMAIN"),
  xmppAdminJid: optionalValue("XMPP_ADMIN_JID"),
  xmppAdminUsers: optionalList("XMPP_ADMIN_USERS"),
  xmppApiBaseUrl: optionalValue("XMPP_API_BASE_URL"),
  xmppApiUser,
  xmppApiPass,
  xmppClientPort: Number(requireValue("XMPP_CLIENT_PORT", "5222")),
  xmppFederationEnabled: parseBoolean("XMPP_FEDERATION_ENABLED", false),
  xmppFederationPort: Number(requireValue("XMPP_FEDERATION_PORT", "5269")),
  xmppAdminPort: Number(requireValue("XMPP_ADMIN_PORT", "5443")),
  xmppComposeProfile: requireValue("XMPP_COMPOSE_PROFILE", "xmpp")
};
