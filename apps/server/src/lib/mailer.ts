import nodemailer from "nodemailer";
import { config } from "../config.js";

export const createMailer = () =>
  nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    auth: config.smtpUser && config.smtpPass ? {
      user: config.smtpUser,
      pass: config.smtpPass
    } : undefined
  });
