const requireValue = (name: string, fallback?: string) => {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing environment variable ${name}`);
  }
  return value;
};

export const config = {
  appHost: requireValue("APP_HOST", "0.0.0.0"),
  appPort: Number(requireValue("APP_PORT", "8080")),
  appUrl: requireValue("APP_URL", "http://localhost:8080"),
  databaseUrl: requireValue("DATABASE_URL"),
  sessionSecret: requireValue("SESSION_SECRET"),
  mailFrom: requireValue("MAIL_FROM", "noreply@classic-chat.local"),
  smtpHost: requireValue("SMTP_HOST", "mailpit"),
  smtpPort: Number(requireValue("SMTP_PORT", "1025")),
  uploadDir: requireValue("UPLOAD_DIR", "uploads"),
  maxFileBytes: Number(requireValue("MAX_FILE_BYTES", String(20 * 1024 * 1024))),
  maxImageBytes: Number(requireValue("MAX_IMAGE_BYTES", String(3 * 1024 * 1024)))
};
