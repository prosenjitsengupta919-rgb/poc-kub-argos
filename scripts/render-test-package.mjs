import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";

const packagePath = process.argv[2] ?? "test-packages/demo/next-ui.yaml";
const namespace = process.argv[3] ?? "test-pr-1";
const outputDir = path.join("rendered", namespace);

const shellQuote = (value) => `'${String(value).replaceAll("'", "'\\''")}'`;

const source = await readFile(packagePath, "utf8");
const testPackage = YAML.parse(source);
const app = testPackage?.spec?.target?.app;
const sourceSpec = testPackage?.spec?.source;
const runner = testPackage?.spec?.runner;

if (!app?.name || !app?.image || !app?.containerPort || !app?.servicePort) {
  throw new Error(
    `TestPackage ${packagePath} must define spec.target.app name, image, containerPort, and servicePort.`,
  );
}

if (!sourceSpec?.repo || !sourceSpec?.ref || !sourceSpec?.path) {
  throw new Error(`TestPackage ${packagePath} must define spec.source repo, ref, and path.`);
}

if (!runner?.type || !runner?.command) {
  throw new Error(`TestPackage ${packagePath} must define spec.runner type and command.`);
}

const labels = {
  app: app.name,
  "testinfra.poc/package": testPackage.metadata.name,
  "testinfra.poc/owner": testPackage.metadata.owner,
};

const namespaceManifest = {
  apiVersion: "v1",
  kind: "Namespace",
  metadata: {
    name: namespace,
    labels: {
      "testinfra.poc/managed-by": "render-test-package",
      "testinfra.poc/package": testPackage.metadata.name,
      "testinfra.poc/owner": testPackage.metadata.owner,
    },
  },
};

const deploymentManifest = {
  apiVersion: "apps/v1",
  kind: "Deployment",
  metadata: {
    name: app.name,
    namespace,
    labels: { ...labels },
  },
  spec: {
    replicas: app.replicas ?? 1,
    selector: {
      matchLabels: {
        app: app.name,
      },
    },
    template: {
      metadata: {
        labels: { ...labels },
      },
      spec: {
        containers: [
          {
            name: "web",
            image: app.image,
            imagePullPolicy: "IfNotPresent",
            ports: [
              {
                containerPort: app.containerPort,
              },
            ],
            readinessProbe: {
              httpGet: {
                path: "/",
                port: app.containerPort,
              },
              initialDelaySeconds: 5,
              periodSeconds: 10,
            },
            livenessProbe: {
              httpGet: {
                path: "/",
                port: app.containerPort,
              },
              initialDelaySeconds: 15,
              periodSeconds: 20,
            },
          },
        ],
      },
    },
  },
};

const serviceManifest = {
  apiVersion: "v1",
  kind: "Service",
  metadata: {
    name: app.name,
    namespace,
    labels: { ...labels },
  },
  spec: {
    type: "ClusterIP",
    selector: {
      app: app.name,
    },
    ports: [
      {
        name: "http",
        port: app.servicePort,
        targetPort: app.containerPort,
      },
    ],
  },
};

const baseUrl = `http://${app.name}.${namespace}.svc.cluster.local:${app.servicePort}`;
const checkoutDir = "/workspace/source";
const packageDir = path.posix.join(checkoutDir, sourceSpec.path);
const runnerCommand = [
  `git clone --branch ${shellQuote(sourceSpec.ref)} --depth 1 ${shellQuote(sourceSpec.repo)} ${shellQuote(checkoutDir)}`,
  `cd ${shellQuote(packageDir)}`,
  "npm ci",
  runner.command,
].join(" && ");

const runnerEnv = [
  {
    name: "CI",
    value: "true",
  },
  {
    name: "PLAYWRIGHT_BASE_URL",
    value: baseUrl,
  },
];

if (testPackage?.spec?.notifications?.argos) {
  runnerEnv.push({
    name: "ARGOS_TOKEN",
    valueFrom: {
      secretKeyRef: {
        name: "argos-token",
        key: "ARGOS_TOKEN",
        optional: true,
      },
    },
  });
}

const jobManifest = {
  apiVersion: "batch/v1",
  kind: "Job",
  metadata: {
    name: `${testPackage.metadata.name}-runner`,
    namespace,
    labels: { ...labels },
  },
  spec: {
    backoffLimit: 0,
    template: {
      metadata: {
        labels: { ...labels },
      },
      spec: {
        restartPolicy: "Never",
        containers: [
          {
            name: "runner",
            image: runner.image ?? "mcr.microsoft.com/playwright:v1.61.0-noble",
            imagePullPolicy: "IfNotPresent",
            command: ["/bin/sh", "-lc"],
            args: [runnerCommand],
            env: runnerEnv,
          },
        ],
      },
    },
  },
};

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

const files = [
  ["namespace.yaml", namespaceManifest],
  ["deployment.yaml", deploymentManifest],
  ["service.yaml", serviceManifest],
  ["job.yaml", jobManifest],
];

for (const [fileName, manifest] of files) {
  await writeFile(path.join(outputDir, fileName), YAML.stringify(manifest), "utf8");
}

console.log(`Rendered ${packagePath} into ${outputDir}`);
console.log(`Apply with: kubectl apply -f ${outputDir}`);
