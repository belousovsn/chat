import nodemailer from "nodemailer";
import { config } from "../config.js";

export const createMailer = () =>
  nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: false
  });
