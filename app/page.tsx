const services = [
  { name: "Next.js Web", status: "Ready", detail: "3 replicas", tone: "green" },
  { name: "Kubernetes", status: "Queued", detail: "manifest pending", tone: "amber" },
  { name: "Argos", status: "Next", detail: "visual checks", tone: "blue" },
];

const releases = [
  { label: "Build", value: "Passing", meta: "main" },
  { label: "Image", value: "Pending", meta: "registry" },
  { label: "Preview", value: "Local", meta: "3000" },
];

export default function Home() {
  return (
    <main className="shell">
      <section className="topbar" aria-label="Project status">
        <div>
          <p className="eyebrow">POC workspace</p>
          <h1>Kube Argos2 Control</h1>
        </div>
        <div className="status-pill">
          <span className="pulse" />
          Local preview
        </div>
      </section>

      <section className="hero-grid" aria-label="Application overview">
        <div className="panel primary-panel">
          <div>
            <p className="eyebrow">Release path</p>
            <h2>Ship UI changes with visible confidence.</h2>
            <p className="copy">
              A small Next.js surface for Kubernetes deployment and PR visual review.
            </p>
          </div>

          <div className="release-row">
            {releases.map((item) => (
              <article className="metric" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <small>{item.meta}</small>
              </article>
            ))}
          </div>
        </div>

        <div className="cluster-visual" aria-label="Cluster preview">
          <div className="node node-a">
            <span />
            <strong>web</strong>
          </div>
          <div className="node node-b">
            <span />
            <strong>svc</strong>
          </div>
          <div className="node node-c">
            <span />
            <strong>test</strong>
          </div>
          <div className="route route-one" />
          <div className="route route-two" />
        </div>
      </section>

      <section className="service-grid" aria-label="Service readiness">
        {services.map((service) => (
          <article className="service-card" key={service.name}>
            <div className={`dot ${service.tone}`} />
            <div>
              <h3>{service.name}</h3>
              <p>{service.detail}</p>
            </div>
            <strong>{service.status}</strong>
          </article>
        ))}
      </section>
    </main>
  );
}
