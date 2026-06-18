import { spawn } from "node:child_process";

const namespace = process.argv[2] ?? "test-pr-1";

const child = spawn("kubectl", ["delete", "namespace", namespace, "--ignore-not-found=true"], {
  stdio: "inherit",
});

child.on("error", (error) => {
  throw error;
});

child.on("exit", (code) => {
  if (code !== 0) {
    process.exitCode = code ?? 1;
  }
});
