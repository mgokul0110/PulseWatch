import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import api from "../services/api";

export default function MonitorDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [monitor, setMonitor] = useState<any>(null);
  const [checks, setChecks] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDetails = async () => {
      try {
        const [
          monitorResponse,
          historyResponse,
          incidentsResponse,
        ] = await Promise.all([
          api.get(`/monitors/${id}`, {
            headers: {
              "Cache-Control": "no-cache",
            },
          }),
          api.get(`/check-history/${id}`, {
            headers: {
              "Cache-Control": "no-cache",
            },
          }),
          api.get(`/incidents/${id}`, {
            headers: {
              "Cache-Control": "no-cache",
            },
          }),
        ]);

        setMonitor(monitorResponse.data);
        setChecks(historyResponse.data);
        setIncidents(incidentsResponse.data);
      } catch (error) {
        console.error("Failed to load monitor details:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 p-8 text-white">
        <p className="text-slate-400">Loading monitor...</p>
      </div>
    );
  }

  if (!monitor) {
    return (
      <div className="min-h-screen bg-slate-950 p-8 text-white">
        <p className="text-red-400">Monitor not found.</p>

        <button
          onClick={() => navigate("/")}
          className="mt-4 rounded-lg bg-blue-600 px-4 py-2"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const latestCheck = checks[0];

  const successfulChecks = checks.filter(
    (check) => check.is_success
  ).length;

  const uptime =
    checks.length > 0
      ? ((successfulChecks / checks.length) * 100).toFixed(2)
      : "0.00";

  const chartChecks = [...checks]
    .reverse()
    .map((check) => ({
      time: new Date(check.checked_at).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      responseTime: check.response_time_ms ?? 0,
      uptime: check.is_success ? 100 : 0,
    }));

  const calculateDuration = (
    startedAt: string,
    resolvedAt: string | null
  ) => {
    const start = new Date(startedAt).getTime();

    const end = resolvedAt
      ? new Date(resolvedAt).getTime()
      : Date.now();

    const duration = Math.max(0, end - start);

    const minutes = Math.floor(duration / 60000);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }

    return `${minutes}m`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <button
          onClick={() => navigate("/")}
          className="mb-6 flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
        >
          <ArrowLeft size={18} />
          Back to Dashboard
        </button>

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">{monitor.name}</h1>

            <p className="mt-2 break-all text-slate-400">
              {monitor.url}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`h-3 w-3 rounded-full ${
                latestCheck?.is_success
                  ? "bg-green-400"
                  : "bg-red-400"
              }`}
            />

            <span
              className={
                latestCheck?.is_success
                  ? "font-medium text-green-400"
                  : "font-medium text-red-400"
              }
            >
              {latestCheck?.is_success ? "UP" : "DOWN"}
            </span>
          </div>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm text-slate-400">Uptime</p>
              <CheckCircle2 size={20} className="text-slate-500" />
            </div>

            <p className="text-3xl font-bold">{uptime}%</p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm text-slate-400">
                Response Time
              </p>
              <Clock3 size={20} className="text-slate-500" />
            </div>

            <p className="text-3xl font-bold">
              {latestCheck?.response_time_ms != null
                ? `${latestCheck.response_time_ms}ms`
                : "—"}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm text-slate-400">Status Code</p>
              <Activity size={20} className="text-slate-500" />
            </div>

            <p className="text-3xl font-bold">
              {latestCheck?.status_code ?? "—"}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm text-slate-400">Incidents</p>
              <AlertTriangle
                size={20}
                className="text-slate-500"
              />
            </div>

            <p className="text-3xl font-bold">
              {incidents.length}
            </p>
          </div>
        </div>

        <div className="mb-8 rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-1 text-xl font-semibold">
            Response Time
          </h2>

          <p className="mb-6 text-sm text-slate-400">
            Response time across recent API checks.
          </p>

          {chartChecks.length === 0 ? (
            <div className="flex h-72 items-center justify-center text-slate-500">
              No response-time data available yet.
            </div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartChecks}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />

                  <XAxis
                    dataKey="time"
                    tick={{ fill: "#64748b", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <YAxis
                    tick={{ fill: "#64748b", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    unit="ms"
                  />

                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      border: "1px solid #334155",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                  />

                  <Line
                    type="monotone"
                    dataKey="responseTime"
                    stroke="#60a5fa"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="mb-8 rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-1 text-xl font-semibold">
            Availability
          </h2>

          <p className="mb-6 text-sm text-slate-400">
            Successful and failed checks over time.
          </p>

          {chartChecks.length === 0 ? (
            <div className="flex h-72 items-center justify-center text-slate-500">
              No availability data available yet.
            </div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartChecks}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />

                  <XAxis
                    dataKey="time"
                    tick={{ fill: "#64748b", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: "#64748b", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => `${value}%`}
                  />

                  <Tooltip
                    formatter={(value) => [
                      `${value}%`,
                      "Availability",
                    ]}
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      border: "1px solid #334155",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                  />

                  <Line
                    type="stepAfter"
                    dataKey="uptime"
                    stroke="#4ade80"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="mb-8 rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-5 text-xl font-semibold">
            Monitor Configuration
          </h2>

          <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
            <div>
              <p className="text-xs text-slate-500">Method</p>
              <p className="mt-1 font-medium">{monitor.method}</p>
            </div>

            <div>
              <p className="text-xs text-slate-500">
                Expected Status
              </p>
              <p className="mt-1 font-medium">
                {monitor.expected_status}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">
                Check Interval
              </p>
              <p className="mt-1 font-medium">
                {monitor.interval_seconds}s
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">Status</p>
              <p className="mt-1 font-medium">
                {monitor.is_active ? "Active" : "Paused"}
              </p>
            </div>
          </div>
        </div>

        <div className="mb-8 rounded-xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 p-6">
            <h2 className="text-xl font-semibold">
              Incident History
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              API outages and recovery events.
            </p>
          </div>

          {incidents.length === 0 ? (
            <div className="p-10 text-center">
              <CheckCircle2
                className="mx-auto mb-3 text-green-400"
                size={32}
              />

              <p className="font-medium">
                No incidents recorded
              </p>

              <p className="mt-1 text-sm text-slate-500">
                This monitor has been running without recorded
                outages.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {incidents.map((incident) => (
                <div key={incident.id} className="p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3">
                      {incident.status === "open" ? (
                        <XCircle
                          size={22}
                          className="mt-0.5 text-red-400"
                        />
                      ) : (
                        <CheckCircle2
                          size={22}
                          className="mt-0.5 text-green-400"
                        />
                      )}

                      <div>
                        <div className="flex items-center gap-3">
                          <p
                            className={
                              incident.status === "open"
                                ? "font-medium text-red-400"
                                : "font-medium text-green-400"
                            }
                          >
                            {incident.status === "open"
                              ? "Incident Open"
                              : "Incident Resolved"}
                          </p>

                          <span
                            className={`rounded-full px-2 py-1 text-xs ${
                              incident.status === "open"
                                ? "bg-red-500/10 text-red-400"
                                : "bg-green-500/10 text-green-400"
                            }`}
                          >
                            {incident.status}
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-slate-400">
                          {incident.reason ||
                            "Monitor check failed"}
                        </p>
                      </div>
                    </div>

                    <div className="text-left text-sm sm:text-right">
                      <p className="text-slate-300">
                        {new Date(
                          incident.started_at
                        ).toLocaleString()}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {incident.resolved_at
                          ? `Resolved ${new Date(
                              incident.resolved_at
                            ).toLocaleString()}`
                          : "Still ongoing"}
                      </p>

                      <p className="mt-2 font-medium text-slate-300">
                        Duration:{" "}
                        {calculateDuration(
                          incident.started_at,
                          incident.resolved_at
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 p-6">
            <h2 className="text-xl font-semibold">
              Check History
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Latest monitoring results.
            </p>
          </div>

          {checks.length === 0 ? (
            <div className="p-10 text-center text-slate-500">
              No checks recorded yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {checks.map((check) => (
                <div
                  key={check.id}
                  className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    {check.is_success ? (
                      <CheckCircle2
                        size={20}
                        className="text-green-400"
                      />
                    ) : (
                      <XCircle
                        size={20}
                        className="text-red-400"
                      />
                    )}

                    <div>
                      <p
                        className={
                          check.is_success
                            ? "font-medium text-green-400"
                            : "font-medium text-red-400"
                        }
                      >
                        {check.is_success
                          ? "Successful"
                          : "Failed"}
                      </p>

                      <p className="text-sm text-slate-500">
                        {new Date(
                          check.checked_at
                        ).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6 text-sm sm:grid-cols-3">
                    <div>
                      <p className="text-xs text-slate-500">
                        Status
                      </p>

                      <p className="mt-1">
                        {check.status_code ?? "—"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">
                        Response
                      </p>

                      <p className="mt-1">
                        {check.response_time_ms != null
                          ? `${check.response_time_ms}ms`
                          : "—"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">
                        Error
                      </p>

                      <p className="mt-1 max-w-xs truncate text-red-400">
                        {check.error_message || "—"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}