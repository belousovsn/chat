import { readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const findTestFiles = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return findTestFiles(fullPath);
    }
    return entry.name.endsWith(".test.ts") ? [fullPath] : [];
  }));

  return nested.flat().sort();
};

const run = async () => {
  const srcDirectory = path.resolve("src");
  const testFiles = await findTestFiles(srcDirectory);

  if (testFiles.length === 0) {
    console.log("No server tests found.");
    return;
  }

  const tsxCli = require.resolve("tsx/cli");
  await new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, [tsxCli, "--test", ...testFiles], {
      stdio: "inherit"
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Server tests failed with exit code ${code ?? 1}.`));
    });
    child.on("error", reject);
  });
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
