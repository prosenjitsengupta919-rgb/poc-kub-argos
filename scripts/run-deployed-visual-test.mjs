import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import YAML from "yaml";

const packagePath = process.argv[2] ?? "test-packages/demo/next-ui.yaml";
const namespace = process.argv[3] ?? "test-pr-1";
const localPort = process.env.TEST_LOCAL_PORT ?? "31080";

const source = await readFile(packagePath, "utf8");
const testPackage = YAML.parse(source);
const app = testPackage?.spec?.target?.app;
const command = testPackage?.spec?.runner?.command;

if (!app?.name || !app?.servicePort) {
  throw new Error(`TestPackage ${packagePath} must define spec.target.app name and servicePort.`);
}

if (!command) {
  throw new Error(`TestPackage ${packagePath} must define spec.runner.command.`);
}

const waitForPortForward = (child) =>
  new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      child.stdout.off("data", onData);
      child.stderr.off("data", onData);
      reject(new Error("Timed out waiting for kubectl port-forward to become ready."));
    }, 30_000);

    const onData = (chunk) => {
      const message = chunk.toString();
      process.stdout.write(message);

      if (message.includes("Forwarding from")) {
        clearTimeout(timeout);
        child.stdout.off("data", onData);
        child.stderr.off("data", onData);
        resolve();
      }
    };

    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.on("error", reject);
    child.on("exit", (code) => {
      clearTimeout(timeout);
      reject(new Error(`kubectl port-forward exited early with code ${code}`));
    });
  });

const run = (shellCommand, env) =>
  new Promise((resolve, reject) => {
    console.log(`$ ${shellCommand}`);
    const child = spawn(shellCommand, {
      env,
      shell: true,
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${shellCommand} exited with code ${code}`));
      }
    });
  });

const baseUrl = `http://127.0.0.1:${localPort}`;
const portForward = spawn(
  "kubectl",
  ["-n", namespace, "port-forward", `service/${app.name}`, `${localPort}:${app.servicePort}`],
  {
    stdio: ["ignore", "pipe", "pipe"],
  },
);

try {
  await waitForPortForward(portForward);
  await run(command, {
    ...process.env,
    PLAYWRIGHT_BASE_URL: baseUrl,
  });
  console.log(`Visual test passed against ${baseUrl}`);
} finally {
  portForward.kill("SIGTERM");
}
