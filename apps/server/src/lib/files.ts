import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { config } from "../config.js";

export const ensureUploadDir = async () => {
  await mkdir(config.uploadDir, { recursive: true });
};

export const resolveUploadPath = (storedName: string) => path.join(config.uploadDir, storedName);

export const deleteStoredFile = async (storedName: string | null) => {
  if (!storedName) {
    return;
  }
  await rm(resolveUploadPath(storedName), { force: true });
};

export const deleteStoredFiles = async (storedNames: Array<string | null | undefined>) => {
  const uniqueNames = [...new Set(storedNames.filter((storedName): storedName is string => Boolean(storedName)))];
  await Promise.all(uniqueNames.map((storedName) => deleteStoredFile(storedName)));
};
