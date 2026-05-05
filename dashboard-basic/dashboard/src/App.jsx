import { createElement, useCallback, useEffect, useState } from "react";
import {
  Activity,
  Cloud,
  Cpu,
  Globe2,
  HardDrive,
  MapPin,
  MemoryStick,
  Network,
  RefreshCw,
  Server,
  ShieldCheck,
  Timer,
  Wifi,
} from "lucide-react";
import Card from "./components/Card";
import QuoteCard from "./components/QuoteCard";
import { mockDashboard, mockQuotes } from "./data/mockDashboard";

const REFRESH_MS = 30000;

const statusStyles = {
  healthy: "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
  warning: "border-amber-400/30 bg-amber-500/10 text-amber-300",
  critical: "border-red-400/30 bg-red-500/10 text-red-300",
  info: "border-cyan-400/30 bg-cyan-500/10 text-cyan-300",
};

const cardIcons = {
  CPU: Cpu,
  Memory: MemoryStick,
  Disk: HardDrive,
  Uptime: Timer,
};

function getPercent(value) {
  const parsed = Number.parseInt(String(value).replace("%", ""), 10);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(parsed, 100)) : 0;
}

function SummaryCard({ card }) {
  const Icon = cardIcons[card.label] || Activity;
  const percent = getPercent(card.value);
  const isPercent = String(card.value).includes("%");
  const styles = statusStyles[card.status] || statusStyles.info;

  return (
    <section
      className={`rounded-2xl border ${styles} p-5 shadow-xl shadow-slate-950/30`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{card.label}</p>
          <p className="mt-3 text-3xl font-semibold text-white">{card.value}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-slate-950/50 p-3">
          {createElement(Icon, { className: "h-5 w-5" })}
        </div>
      </div>
      <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-current transition-all duration-700"
          style={{ width: isPercent ? `${percent}%` : "100%" }}
        />
      </div>
      <p className="mt-3 text-xs uppercase tracking-[0.18em] opacity-80">{card.status || "active"}</p>
    </section>
  );
}

function InfoListCard({ title, subtitle, icon, items }) {
  return (
    <Card title={title} subtitle={subtitle}>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-start gap-3 rounded-xl bg-white/5 p-3">
            {createElement(icon, { className: "mt-0.5 h-4 w-4 flex-none text-cyan-300" })}
            <span className="text-sm text-slate-300">{item.label}</span>
            <span className="ml-auto min-w-0 break-all text-right font-mono text-sm text-slate-400">
              {item.value || "unknown"}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ResourceBar({ label, value, used, total, icon }) {
  const percent = total > 0 ? Math.round((used / total) * 100) : value || 0;
  const color = percent >= 90 ? "bg-red-400" : percent >= 70 ? "bg-amber-400" : "bg-cyan-400";

  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
      <div className="mb-3 flex items-center gap-2">
        {createElement(icon, { className: "h-4 w-4 text-cyan-300" })}
        <h3 className="text-sm font-semibold text-slate-200">{label}</h3>
        <span className="ml-auto font-mono text-sm text-white">{percent}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${percent}%` }} />
      </div>
      {total > 0 && (
        <p className="mt-3 text-xs text-slate-400">
          {Math.round(used / 1024)} GB used / {Math.round(total / 1024)} GB total
        </p>
      )}
    </div>
  );
}

function SystemResources({ resources }) {
  const cpu = resources?.cpu || {};
  const memory = resources?.memory || {};
  const disk = resources?.disk || {};

  return (
    <Card title="System Resources" subtitle="Basic local VM utilization">
      <div className="grid gap-4 md:grid-cols-3">
        <ResourceBar label="CPU" value={cpu.usage || 0} icon={Cpu} />
        <ResourceBar label="Memory" used={memory.used || 0} total={memory.total || 0} icon={MemoryStick} />
        <ResourceBar label="Disk" used={disk.used || 0} total={disk.total || 0} icon={HardDrive} />
      </div>
    </Card>
  );
}

function Services({ services = [] }) {
  return (
    <Card title="Services" subtitle="Local service health">
      <div className="grid gap-3 md:grid-cols-3">
        {services.map((service) => (
          <div key={service.label} className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="mb-2 flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${service.status === "healthy" ? "bg-emerald-400" : "bg-amber-400"}`} />
              <span className="text-sm font-semibold text-slate-200">{service.label}</span>
            </div>
            <p className="text-sm text-slate-400">{service.value}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function App() {
  const [dashboard, setDashboard] = useState(mockDashboard);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const [quote, setQuote] = useState(() => mockQuotes[0]);

  const fetchDashboard = useCallback(async () => {
    try {
      const response = await fetch("/api/dashboard", { cache: "no-store" });
      if (!response.ok) throw new Error(`Dashboard API returned ${response.status}`);
      const data = await response.json();
      setDashboard(data);
      setLastUpdated(new Date());
    } catch (error) {
      console.warn("Using local mock dashboard data:", error);
      setDashboard(mockDashboard);
      setLastUpdated(new Date());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    window.setTimeout(fetchDashboard, 0);
    const interval = window.setInterval(fetchDashboard, REFRESH_MS);
    return () => window.clearInterval(interval);
  }, [fetchDashboard]);

  const identity = dashboard.identity || {};
  const network = dashboard.network || {};
  const location = dashboard.location || {};
  const meta = dashboard.meta || {};

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_32rem),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.10),transparent_28rem)]" />

      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-cyan-400/30 bg-cyan-500/10 p-3 text-cyan-300">
              <Server className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">{meta.dashboardName || "Basic VM Dashboard"}</h1>
              <p className="text-sm text-slate-400">{meta.tagline || "Lightweight VM health and metadata"}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={fetchDashboard}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:border-cyan-300/40 hover:text-cyan-200"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="mb-8 flex flex-col gap-4 rounded-2xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-slate-950/40 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">Basic VM Dashboard</p>
            <h2 className="mt-3 text-3xl font-semibold text-white md:text-4xl">
              Fast health checks for simple VM deployments
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              Uses the local VM and metadata server only. No FinOps, no logs, no Cloud Monitoring, and no service-account-specific dashboard permissions.
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-950/50 p-4 text-sm text-slate-400">
            <div className="flex items-center gap-2 text-emerald-300">
              <ShieldCheck className="h-4 w-4" />
              Basic mode active
            </div>
            <p className="mt-2">
              Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : "loading"}
            </p>
          </div>
        </section>

        <section className="mb-8 grid gap-4 md:grid-cols-4">
          {(dashboard.summaryCards || []).map((card) => (
            <SummaryCard key={card.label} card={card} />
          ))}
        </section>

        <section className="mb-8 grid gap-6 lg:grid-cols-3">
          <InfoListCard
            title="Identity"
            subtitle="Instance identity from local metadata"
            icon={Cloud}
            items={[
              { label: "Project", value: identity.project },
              { label: "Instance ID", value: identity.instanceId },
              { label: "Instance Name", value: identity.instanceName },
              { label: "Machine Type", value: identity.machineType },
            ]}
          />
          <InfoListCard
            title="Network"
            subtitle="Best-effort network details"
            icon={Network}
            items={[
              { label: "VPC", value: network.vpc },
              { label: "Subnet", value: network.subnet },
              { label: "Internal IP", value: network.internalIp },
              { label: "External IP", value: network.externalIp },
            ]}
          />
          <InfoListCard
            title="Location"
            subtitle="Region, zone, and uptime"
            icon={MapPin}
            items={[
              { label: "Region", value: location.region },
              { label: "Zone", value: location.zone },
              { label: "Uptime", value: location.uptime },
              { label: "Hostname", value: identity.hostname },
            ]}
          />
        </section>

        <section className="mb-8">
          <SystemResources resources={dashboard.systemResources} />
        </section>

        <section className="mb-8 grid gap-6 lg:grid-cols-[1fr_0.7fr]">
          <Services services={dashboard.services} />
          <Card title="Monitoring Endpoints" subtitle="Local dashboard endpoints">
            <div className="space-y-3">
              {(dashboard.monitoringEndpoints || []).map((endpoint) => (
                <div key={endpoint.name} className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
                  <Wifi className="h-4 w-4 text-cyan-300" />
                  <span className="text-sm text-slate-300">{endpoint.name}</span>
                  <span className="ml-auto font-mono text-xs text-slate-400">{endpoint.url}</span>
                </div>
              ))}
            </div>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.8fr_1fr]">
          <QuoteCard quote={quote} quotes={mockQuotes} onQuoteChange={setQuote} />
          <Card title="Deployment Scope" subtitle="Designed for basic VM smoke tests">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                "No FinOps APIs",
                "No journal log API",
                "No Cloud Monitoring dependency",
                "No dashboard Basic Auth requirement",
                "No custom VM service account required",
                "ClickOps startup-script friendly",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 rounded-xl bg-white/5 p-3 text-sm text-slate-300">
                  <Globe2 className="h-4 w-4 text-emerald-300" />
                  {item}
                </div>
              ))}
            </div>
          </Card>
        </section>
      </div>
    </main>
  );
}
