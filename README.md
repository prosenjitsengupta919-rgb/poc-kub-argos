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
