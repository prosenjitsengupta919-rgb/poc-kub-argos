import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import YAML from "yaml";

const packagePath = process.argv[2] ?? "test-packages/demo/next-ui.yaml";
const namespace = process.argv[3] ?? "test-pr-1";
const outputDir = path.join("rendered", namespace);

const run = (command, args, options = {}) =>
  new Promise((resolve, reject) => {
    console.log(`$ ${[command, ...args].join(" ")}`);
    const child = spawn(command, args, { stdio: "inherit", ...options });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} exited with code ${code}`));
      }
    });
  });

const source = await readFile(packagePath, "utf8");
const testPackage = YAML.parse(source);
const appName = testPackage?.spec?.target?.app?.name;

if (!appName) {
  throw new Error(`TestPackage ${packagePath} must define spec.target.app.name.`);
}

await run("node", ["scripts/render-test-package.mjs", packagePath, namespace]);
await run("kubectl", [
  "apply",
  "-f",
  path.join(outputDir, "namespace.yaml"),
  "-f",
  path.join(outputDir, "deployment.yaml"),
  "-f",
  path.join(outputDir, "service.yaml"),
]);
await run("kubectl", ["-n", namespace, "rollout", "status", `deployment/${appName}`]);

console.log(`Deployed ${appName} to namespace ${namespace}`);
