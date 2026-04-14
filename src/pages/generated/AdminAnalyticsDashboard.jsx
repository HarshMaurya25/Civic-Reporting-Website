import React, { useEffect, useMemo, useState } from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  Bar,
  BarChart,
  Pie,
  PieChart,
  Cell,
} from "recharts";
import {
  getAdminAnalytics,
  getAdminWards,
  getAdminWorkforce,
} from "../../services/api";

function formatDateLabel(value) {
  if (!value) return "";
  const str = String(value);
  // expects YYYY-MM-DD
  return str.length >= 10 ? str.slice(5, 10) : str;
}

export default function AdminAnalyticsDashboard() {
  const [data, setData] = useState(null);

  const [wards, setWards] = useState([]);
  const [workforce, setWorkforce] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const [response, wardData, workforceData] = await Promise.all([
          getAdminAnalytics(),
          getAdminWards().catch(() => null),
          getAdminWorkforce().catch(() => null),
        ]);

        if (!mounted) return;
        setData(response);
        setWards(wardData?.wards || []);
        setWorkforce(workforceData);
      } catch (err) {
        if (mounted) setError(err.message || "Failed to load analytics.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const totals = useMemo(() => {
    if (!data?.thirtyDays) return { created: 0, resolved: 0 };
    const created = (data.thirtyDays.created || []).reduce(
      (sum, d) => sum + (d.count || 0),
      0,
    );
    const resolved = (data.thirtyDays.resolved || []).reduce(
      (sum, d) => sum + (d.count || 0),
      0,
    );
    return { created, resolved };
  }, [data]);

  const thirtyDaySeries = useMemo(() => {
    const created = data?.thirtyDays?.created || [];
    const resolved = data?.thirtyDays?.resolved || [];

    const map = new Map();
    created.forEach((row) => {
      map.set(row.date, {
        date: row.date,
        created: row.count || 0,
        resolved: 0,
      });
    });
    resolved.forEach((row) => {
      const existing = map.get(row.date);
      if (existing) {
        existing.resolved = row.count || 0;
      } else {
        map.set(row.date, {
          date: row.date,
          created: 0,
          resolved: row.count || 0,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) =>
      String(a.date).localeCompare(String(b.date)),
    );
  }, [data]);

  return (
    <div className="pt-24 px-8 pb-12 space-y-8">
      <h1 className="text-3xl font-black text-primary">City Analytics</h1>

      {loading && (
        <p className="text-on-surface-variant">Loading analytics...</p>
      )}
      {error && <p className="text-error">{error}</p>}

      {!loading && !error && data && (
        <>
          <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-surface-container-lowest p-6 rounded-xl border-l-4 border-primary">
              <p className="text-xs uppercase font-bold text-outline">
                Created (30d)
              </p>
              <p className="text-3xl font-black">{totals.created}</p>
            </div>
            <div className="bg-surface-container-lowest p-6 rounded-xl border-l-4 border-secondary">
              <p className="text-xs uppercase font-bold text-outline">
                Resolved (30d)
              </p>
              <p className="text-3xl font-black">{totals.resolved}</p>
            </div>
            <div className="bg-surface-container-lowest p-6 rounded-xl border-l-4 border-tertiary">
              <p className="text-xs uppercase font-bold text-outline">Wards</p>
              <p className="text-3xl font-black">{wards.length}</p>
            </div>
            <div className="bg-surface-container-lowest p-6 rounded-xl border-l-4 border-error">
              <p className="text-xs uppercase font-bold text-outline">
                Workers
              </p>
              <p className="text-3xl font-black">
                {workforce?.workers?.length || 0}
              </p>
            </div>
          </section>

          <section className="bg-surface-container-lowest p-6 rounded-xl space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-bold">Issues (Last 30 Days)</h2>
              <p className="text-xs text-outline">Created vs Resolved</p>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={thirtyDaySeries}
                  margin={{ top: 10, right: 20, bottom: 0, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={formatDateLabel} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="created"
                    stroke="#1d4ed8"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="resolved"
                    stroke="#16a34a"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Resolution Rate */}
            <article className="bg-surface-container-lowest p-6 rounded-xl space-y-4">
              <h2 className="font-bold">Resolution Rate</h2>
              {(() => {
                const rate = totals.created > 0 ? ((totals.resolved / totals.created) * 100).toFixed(1) : 0;
                const pending = totals.created - totals.resolved;
                return (
                  <div className="space-y-4">
                    <div className="flex items-end gap-4">
                      <p className="text-5xl font-black text-primary">{rate}%</p>
                      <p className="text-sm text-outline pb-1">of issues resolved in 30 days</p>
                    </div>
                    <div className="w-full bg-surface-container-low rounded-full h-3 overflow-hidden">
                      <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${Math.min(rate, 100)}%` }} />
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div className="bg-surface-container-low rounded-lg p-3 text-center">
                        <p className="text-xs uppercase text-outline">Created</p>
                        <p className="text-xl font-black">{totals.created}</p>
                      </div>
                      <div className="bg-surface-container-low rounded-lg p-3 text-center">
                        <p className="text-xs uppercase text-outline">Resolved</p>
                        <p className="text-xl font-black text-green-600">{totals.resolved}</p>
                      </div>
                      <div className="bg-surface-container-low rounded-lg p-3 text-center">
                        <p className="text-xs uppercase text-outline">Pending</p>
                        <p className="text-xl font-black text-amber-600">{pending > 0 ? pending : 0}</p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </article>

            {/* Stage Distribution Pie */}
            <article className="bg-surface-container-lowest p-6 rounded-xl space-y-4">
              <h2 className="font-bold">Weekly Stage Distribution</h2>
              {(data.weeklyStages || []).length > 0 ? (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={(data.weeklyStages || []).map(s => ({ name: (s.stage || "").replaceAll("_", " "), value: s.count || 0 }))}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={95}
                        innerRadius={40}
                        label={({ name, value }) => `${name}: ${value}`}
                        labelLine={false}
                      >
                        {(data.weeklyStages || []).map((_, i) => (
                          <Cell key={i} fill={["#1d4ed8", "#f59e0b", "#16a34a", "#ef4444", "#8b5cf6", "#06b6d4"][i % 6]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-72 flex items-center justify-center">
                  <div className="w-32 h-32 rounded-full border-[6px] border-outline-variant/20 flex items-center justify-center">
                    <span className="text-sm font-bold text-outline">No Data</span>
                  </div>
                </div>
              )}
            </article>
          </section>

          {/* Workforce Summary Bar */}
          {workforce && (
            <section className="bg-surface-container-lowest p-6 rounded-xl space-y-4">
              <h2 className="font-bold">Workforce Summary</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { name: "Supervisors", total: workforce.supervisors?.length || 0, notStarted: workforce.supervisorsNoStart?.length || 0 },
                    { name: "Workers", total: workforce.workers?.length || 0, notStarted: workforce.workersNoStart?.length || 0 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="total" name="Total" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="notStarted" name="Not Started" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <article className="bg-surface-container-lowest p-6 rounded-xl">
              <h2 className="font-bold mb-4">Weekly Stage Counts</h2>
              <div className="space-y-2">
                {(data.weeklyStages || []).map((row) => (
                  <div
                    key={row.stage}
                    className="flex justify-between border-b border-outline-variant/10 pb-2 text-sm"
                  >
                    <span>{(row.stage || "").replaceAll("_", " ")}</span>
                    <span className="font-bold">{row.count}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="bg-surface-container-lowest p-6 rounded-xl">
              <h2 className="font-bold mb-4">Citizen Leaderboard</h2>
              <div className="space-y-2">
                {(data.leaderboard || []).slice(0, 10).map((row, idx) => (
                  <div
                    key={`${row.fullName}-${idx}`}
                    className="flex justify-between border-b border-outline-variant/10 pb-2 text-sm"
                  >
                    <span>
                      {idx + 1}. {row.fullName}
                    </span>
                    <span className="font-bold">{row.score}</span>
                  </div>
                ))}
                {!data.leaderboard?.length && (
                  <p className="text-sm text-outline">
                    No leaderboard data found.
                  </p>
                )}
              </div>
            </article>
          </section>
        </>
      )}
    </div>
  );
}
