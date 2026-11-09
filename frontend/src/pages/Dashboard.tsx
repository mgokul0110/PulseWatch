
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Edit3,
  Pause,
  Play,
  Trash2,
  X,
  LogOut,
} from "lucide-react";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

export default function Dashboard() {
  const navigate = useNavigate();

  // User profile
  const storedUser = localStorage.getItem("user");

  let userName = "User";

  try {
    userName = storedUser
      ? JSON.parse(storedUser).name || "User"
      : "User";
  } catch {
    userName = "User";
  }

  // Dashboard states
  const [serverStatus, setServerStatus] = useState("Checking...");
  const [loading, setLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");

  const [dashboardStats, setDashboardStats] = useState({
    monitoredApis: 0,
    healthy: 0,
    incidents: 0,
    avgResponse: 0,
  });

  const [monitors, setMonitors] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMonitor, setEditingMonitor] = useState<any>(null);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    url: "",
    method: "GET",
    expectedStatus: 200,
    intervalSeconds: 60,
  });

  // Logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    navigate("/login", { replace: true });
  };

  // Dashboard statistics
  const stats = [
    {
      label: "Monitored APIs",
      value: dashboardStats.monitoredApis,
      icon: Activity,
    },
    {
      label: "Healthy",
      value: dashboardStats.healthy,
      icon: CheckCircle2,
    },
    {
      label: "Incidents",
      value: dashboardStats.incidents,
      icon: AlertTriangle,
    },
    {
      label: "Avg Response",
      value: `${dashboardStats.avgResponse}ms`,
      icon: Clock3,
    },
  ];

  // Load dashboard data
  const loadDashboard = async () => {
    try {
      setLoading(true);
      setDashboardError("");

      const [statsResponse, monitorsResponse] = await Promise.all([
        api.get("/dashboard/stats", {
          headers: {
            "Cache-Control": "no-cache",
          },
        }),

        api.get("/monitor-status", {
          headers: {
            "Cache-Control": "no-cache",
          },
        }),
      ]);

      setDashboardStats(statsResponse.data);
      setMonitors(monitorsResponse.data);
    } catch (error) {
      console.error("Failed to load dashboard:", error);

      setDashboardError(
        "Unable to load dashboard data. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Initial loading
  useEffect(() => {
  api
    .get("/health")
    .then((response) => {
      setServerStatus(response.data.message);
    })
    .catch(() => {
      setServerStatus("Backend unavailable");
    });

  loadDashboard();

  const refreshInterval = setInterval(() => {
    loadDashboard();
  }, 30000);

  return () => clearInterval(refreshInterval);
}, []);

  // Open Add API modal
  const openAddModal = () => {
    setEditingMonitor(null);
    setFormError("");

    setFormData({
      name: "",
      url: "",
      method: "GET",
      expectedStatus: 200,
      intervalSeconds: 60,
    });

    setShowAddModal(true);
  };

  // Open Edit API modal
  const openEditModal = (monitor: any) => {
    setEditingMonitor(monitor);
    setFormError("");

    setFormData({
      name: monitor.name,
      url: monitor.url,
      method: monitor.method,
      expectedStatus: monitor.expected_status,
      intervalSeconds: monitor.interval_seconds,
    });

    setShowAddModal(true);
  };

  // Close modal
  const closeModal = () => {
    if (creating) return;

    setShowAddModal(false);
    setEditingMonitor(null);
    setFormError("");
  };

  // Create or update monitor
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    setCreating(true);
    setFormError("");

    try {
      if (editingMonitor) {
        await api.put(`/monitors/${editingMonitor.id}`, formData);
      } else {
        await api.post("/monitors", formData);
      }

      setShowAddModal(false);
      setEditingMonitor(null);

      await loadDashboard();
    } catch (error: any) {
      setFormError(
        error.response?.data?.message ||
          `Failed to ${editingMonitor ? "update" : "create"} monitor`
      );
    } finally {
      setCreating(false);
    }
  };

  // Delete monitor
  const handleDelete = async (monitor: any) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${monitor.name}"?`
    );

    if (!confirmed) return;

    try {
      await api.delete(`/monitors/${monitor.id}`);
      await loadDashboard();
    } catch (error: any) {
      alert(
        error.response?.data?.message || "Failed to delete monitor"
      );
    }
  };

  // Pause or resume monitor
  const handleToggle = async (monitor: any) => {
    try {
      await api.put(`/monitors/${monitor.id}`, {
        isActive: !monitor.is_active,
      });

      await loadDashboard();
    } catch (error: any) {
      alert(
        error.response?.data?.message ||
          "Failed to update monitor status"
      );
    }
  };
  const handleCheckNow = async (monitor: any) => {
  try {
    await api.post(`/checks/${monitor.id}`);

    await loadDashboard();
  } catch (error: any) {
    alert(
      error.response?.data?.message ||
        `Failed to check ${monitor.name}`
    );
  }
};
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-8">

        {/* Dashboard Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              PulseWatch
            </h1>

            <p className="mt-1 text-slate-400">
              API monitoring and performance dashboard
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-xs text-slate-400">
                Welcome back,
              </p>

              <p className="font-semibold text-white">
                {userName}
              </p>
            </div>

            <button
              onClick={openAddModal}
              className="rounded-lg bg-blue-600 px-4 py-2 font-medium transition hover:bg-blue-500"
            >
              + Add API
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 font-medium text-slate-300 transition hover:border-red-500 hover:bg-red-500/10 hover:text-red-400"
            >
              <LogOut size={17} />
              Logout
            </button>
          </div>
        </div>

        {/* Backend Status */}
        <div className="mb-6 rounded-lg border border-slate-800 bg-slate-900 px-4 py-3">
          <p className="text-sm text-slate-400">
            <span className="mr-2 text-green-400">●</span>
            {serverStatus}
          </p>
        </div>

        {/* Dashboard Statistics */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <div
                key={stat.label}
                className="rounded-xl border border-slate-800 bg-slate-900 p-5"
              >
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm text-slate-400">
                    {stat.label}
                  </p>

                  <Icon
                    size={20}
                    className="text-slate-500"
                  />
                </div>

                <p className="text-3xl font-bold">
                  {stat.value}
                </p>
              </div>
            );
          })}
        </div>

        {/* Loading, Error and Monitor States */}
        {loading ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-12 text-center">
            <Activity
              className="mx-auto mb-4 animate-pulse text-blue-400"
              size={36}
            />

            <p className="text-slate-400 animate-pulse">
              Loading dashboard data...
            </p>
          </div>
        ) : dashboardError ? (
          <div className="rounded-xl border border-red-900 bg-red-950/30 p-8 text-center">
            <AlertTriangle
              className="mx-auto mb-4 text-red-400"
              size={36}
            />

            <p className="text-red-400">
              {dashboardError}
            </p>

            <button
              onClick={loadDashboard}
              className="mt-4 rounded-lg bg-blue-600 px-5 py-2 font-medium hover:bg-blue-500"
            >
              Retry
            </button>
          </div>
        ) : monitors.length > 0 ? (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold">
                Your Monitors
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Click a monitor to view detailed performance history.
              </p>
            </div>

            {monitors.map((monitor) => (
              <div
                key={monitor.id}
                onClick={() => navigate(`/monitors/${monitor.id}`)}
                className={`cursor-pointer rounded-xl border bg-slate-900 p-5 transition hover:border-slate-600 hover:bg-slate-900/80 ${
                  monitor.is_active
                    ? "border-slate-800"
                    : "border-yellow-900/50"
                }`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold">
                        {monitor.name}
                      </h3>

                      {!monitor.is_active && (
                        <span className="rounded-full bg-yellow-500/10 px-2 py-1 text-xs text-yellow-400">
                          PAUSED
                        </span>
                      )}
                    </div>

                    <p className="mt-1 break-all text-sm text-slate-400">
                      {monitor.url}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {monitor.is_active ? (
                      <>
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${
                            monitor.is_success
                              ? "bg-green-400"
                              : "bg-red-400"
                          }`}
                        />

                        <span
                          className={
                            monitor.is_success
                              ? "text-sm text-green-400"
                              : "text-sm text-red-400"
                          }
                        >
                          {monitor.is_success ? "UP" : "DOWN"}
                        </span>
                      </>
                    ) : (
                      <span className="text-sm text-yellow-400">
                        PAUSED
                      </span>
                    )}
                  </div>
                </div>

                {/* Monitor Information */}
                <div className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-800 pt-4 sm:grid-cols-4">
                  <div>
                    <p className="text-xs text-slate-500">
                      Method
                    </p>

                    <p className="mt-1 font-medium">
                      {monitor.method}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      Status Code
                    </p>

                    <p className="mt-1 font-medium">
                      {monitor.status_code ?? "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      Response Time
                    </p>

                    <p className="mt-1 font-medium">
                      {monitor.response_time_ms != null
                        ? `${monitor.response_time_ms}ms`
                        : "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      Last Checked
                    </p>

                    <p className="mt-1 font-medium">
                      {monitor.checked_at
                        ? new Date(
                            monitor.checked_at
                          ).toLocaleString()
                        : "Never"}
                    </p>
                  </div>
                </div>

                {/* Monitor Actions */}
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="mt-5 flex flex-wrap gap-2 border-t border-slate-800 pt-4"
                >
                  <button
  onClick={() => handleCheckNow(monitor)}
  className="flex items-center gap-2 rounded-lg border border-cyan-800 px-3 py-2 text-sm font-medium text-cyan-400 transition hover:bg-cyan-950/50"
>
  <Activity size={16} />
  Check Now
</button>
                  <button
                    onClick={() => openEditModal(monitor)}
                    className="flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
                  >
                    <Edit3 size={16} />
                    Edit
                  </button>

                  <button
                    onClick={() => handleToggle(monitor)}
                    className="flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
                  >
                    {monitor.is_active ? (
                      <>
                        <Pause size={16} />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play size={16} />
                        Resume
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleDelete(monitor)}
                    className="flex items-center gap-2 rounded-lg border border-red-900/60 px-3 py-2 text-sm font-medium text-red-400 transition hover:bg-red-950/50"
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-12 text-center">
            <Activity
              className="mx-auto mb-4 text-slate-600"
              size={40}
            />

            <h2 className="text-xl font-semibold">
              No API activity yet
            </h2>

            <p className="mx-auto mt-2 max-w-md text-slate-400">
              Add an API monitor to start tracking uptime, response
              time, and incidents.
            </p>

            <button
              onClick={openAddModal}
              className="mt-6 rounded-lg bg-blue-600 px-5 py-2 font-medium transition hover:bg-blue-500"
            >
              Add your first API
            </button>
          </div>
        )}
      </div>

      {/* Add / Edit Monitor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">
                  {editingMonitor
                    ? "Edit API Monitor"
                    : "Add API Monitor"}
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  {editingMonitor
                    ? "Update your monitor configuration."
                    : "Configure an API endpoint to monitor."}
                </p>
              </div>

              <button
                onClick={closeModal}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  API Name
                </label>

                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      name: e.target.value,
                    })
                  }
                  placeholder="JSONPlaceholder API"
                  required
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  API URL
                </label>

                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      url: e.target.value,
                    })
                  }
                  placeholder="https://api.example.com/health"
                  required
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Method
                  </label>

                  <select
                    value={formData.method}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        method: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-blue-500"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="PATCH">PATCH</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Expected Status
                  </label>

                  <input
                    type="number"
                    min="100"
                    max="599"
                    value={formData.expectedStatus}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        expectedStatus: Number(e.target.value),
                      })
                    }
                    required
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Check Interval
                </label>

                <select
                  value={formData.intervalSeconds}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      intervalSeconds: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-blue-500"
                >
                  <option value={60}>Every 1 minute</option>
                  <option value={300}>Every 5 minutes</option>
                  <option value={600}>Every 10 minutes</option>
                  <option value={1800}>Every 30 minutes</option>
                  <option value={3600}>Every 1 hour</option>
                </select>
              </div>

              {formError && (
                <div className="rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-400">
                  {formError}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-slate-700 px-4 py-2 font-medium text-slate-300 transition hover:bg-slate-800"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-lg bg-blue-600 px-5 py-2 font-medium transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {creating
                    ? "Saving..."
                    : editingMonitor
                    ? "Save Changes"
                    : "Create Monitor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
