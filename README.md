# poc-kub-argos

POC workspace for a Next.js UI that will later be deployed to Kubernetes and checked with Argos visual tests.

## Step 1: Next.js app

Install dependencies and start the local app:

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Step 2: Docker and Kubernetes

Build the container image:

```bash
docker build -t poc-kub-argos:latest .
```

Deploy to Kubernetes:

```bash
kubectl apply -f k8s/
kubectl get pods
kubectl get services
```

Open the app through port forwarding:

```bash
kubectl port-forward service/poc-kub-argos 3000:80
```

Open http://localhost:3000.

## Step 3: Argos visual tests

Install Playwright's browser once:

```bash
npx playwright install chromium
```

Run the local visual test:

```bash
npm run test:visual
```

The local command runs Playwright in headed mode so you can see the browser. The GitHub Actions workflow in `.github/workflows/visual-tests.yml` runs headless on pull requests and uploads screenshots to Argos when CI is running. Add `ARGOS_TOKEN` as a GitHub repository secret if your Argos setup requires it.

## Step 4: TestPackage contract

The file `test-packages/demo/next-ui.yaml` describes the test in one portable contract:

- what event triggers it
- which app/image it targets
- where the test source lives
- which runner command executes the test
- whether Argos reporting is expected

In the larger snowsk8s design, a platform workflow reads this file, renders Kubernetes manifests for an ephemeral namespace, deploys the workload, runs the test, reports the result, and cleans up.

## Step 5: Render a TestPackage

Render the demo package into an ephemeral PR namespace:

```bash
npm run render:test-package
```

This reads `test-packages/demo/next-ui.yaml` and writes generated Kubernetes manifests to `rendered/test-pr-1/`.

You can choose a package and namespace explicitly:

```bash
npm run render:test-package -- test-packages/demo/next-ui.yaml test-pr-123
```

The rendered output includes:

- a Namespace for the ephemeral test run
- a Deployment and Service for the target app
- a Job that checks out the source repo and runs the package's Playwright command against the in-cluster Service

The Job sets `PLAYWRIGHT_BASE_URL` to the generated Service URL, so Playwright skips its local dev server and tests the deployed workload. If Argos upload is enabled, the Job looks for `ARGOS_TOKEN` in a Kubernetes secret named `argos-token`.

## Step 6: Deploy, test, and clean up the namespace

Build the local image first so Docker Desktop Kubernetes can pull it:

```bash
docker build -t poc-kub-argos:latest .
```

Deploy the rendered app workload to `test-pr-1`:

```bash
npm run deploy:test-package
```

Run the visual test against the deployed Service:

```bash
npm run test:deployed
```

This command opens a temporary port-forward to the Service and runs the package's Playwright command with `PLAYWRIGHT_BASE_URL` pointed at the deployed app.

Clean up the ephemeral namespace:

```bash
npm run cleanup:test-package
```

## Step 7: Argo Workflows

The workflow manifests in `argo-workflows/` automate the same deploy, visual test, and cleanup flow:

```bash
kubectl create -f argo-workflows/poc-kub-argos-workflow.yaml
```

The scheduled version is a `CronWorkflow`. It is checked in as suspended so it will not run automatically until you enable it:

```bash
kubectl apply -f argo-workflows/poc-kub-argos-cronworkflow.yaml
kubectl -n argo get cronworkflows
```

Create the Argos token secret before running workflows that should upload visual results:

```bash
kubectl -n argo create secret generic argos-token --from-literal=ARGOS_TOKEN='<your-argos-token>'
```

Run it once manually from the Argo Workflows UI by opening `Cron Workflows`, selecting `poc-kub-argos-scheduled`, and choosing `Submit`.

Enable the schedule:

```bash
kubectl -n argo patch cronworkflow poc-kub-argos-scheduled --type=merge -p '{"spec":{"suspend":false}}'
```

Pause it again:

```bash
kubectl -n argo patch cronworkflow poc-kub-argos-scheduled --type=merge -p '{"spec":{"suspend":true}}'
```
