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

if ((smtpUser && !smtpPass) || (!smtpUser && smtpPass)) {
  throw new Error("SMTP_USER and SMTP_PASS must either both be set or both be empty");
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
  maxImageBytes: Number(requireValue("MAX_IMAGE_BYTES", String(3 * 1024 * 1024)))
};
