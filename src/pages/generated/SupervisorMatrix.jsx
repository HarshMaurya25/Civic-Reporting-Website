import React, { useEffect, useMemo, useState } from "react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { getSupervisorIssueMatrix } from "../../services/api";
import { getUser } from "../../lib/session";

const PIE_COLORS = ["#1d4ed8", "#f59e0b", "#16a34a"];

function toPieData(bucket) {
  if (!bucket) return [];
  return [
    { name: "Reported", value: bucket.reported ?? 0 },
    { name: "In Progress", value: bucket.inBetween ?? 0 },
    { name: "Solved", value: bucket.solved ?? 0 },
  ];
}

function total(bucket) {
  if (!bucket) return 0;
  return (bucket.reported || 0) + (bucket.inBetween || 0) + (bucket.solved || 0);
}

function MatrixCard({ title, bucket }) {
  const data = useMemo(() => toPieData(bucket), [bucket]);
  const hasData = data.some((entry) => entry.value > 0);

  return (
    <article className="bg-surface-container-lowest rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold">{title}</h2>
        <span className="text-xs font-semibold text-outline">
          Total: {total(bucket)}
        </span>
      </div>
      {hasData ? (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={45}
                outerRadius={80}
                label={({ name, value }) => `${name}: ${value}`}
                labelLine={false}
              >
                {data.map((entry, index) => (
                  <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-64 rounded-xl bg-surface-container-low flex items-center justify-center">
          <p className="text-sm text-outline">No matrix data available.</p>
        </div>
      )}
    </article>
  );
}

export default function SupervisorMatrix() {
  const user = getUser();
  const [matrix, setMatrix] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!user?.id) {
        setError("Supervisor ID missing in session. Please login again.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      try {
        const response = await getSupervisorIssueMatrix(user.id);
        if (mounted) {
          setMatrix(response || null);
        }
      } catch (err) {
        if (mounted) {
          setError(err.message || "Failed to load supervisor matrix.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  return (
    <div className="pt-24 px-8 pb-12 space-y-6">
      <h1 className="text-3xl font-black text-primary">Supervisor Matrix</h1>
      {loading && <p>Loading matrix...</p>}
      {error && <p className="text-error">{error}</p>}

      {!loading && !error && (
        <>
          <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-surface-container-lowest rounded-xl p-5 border-l-4 border-primary">
              <p className="text-xs uppercase font-bold text-outline">Ward</p>
              <p className="text-2xl font-black">
                {matrix?.wardName || matrix?.name || "N/A"}
              </p>
            </div>
            <div className="bg-surface-container-lowest rounded-xl p-5 border-l-4 border-secondary">
              <p className="text-xs uppercase font-bold text-outline">Daily Total</p>
              <p className="text-3xl font-black">{total(matrix?.daily)}</p>
            </div>
            <div className="bg-surface-container-lowest rounded-xl p-5 border-l-4 border-tertiary">
              <p className="text-xs uppercase font-bold text-outline">Weekly Total</p>
              <p className="text-3xl font-black">{total(matrix?.weekly)}</p>
            </div>
            <div className="bg-surface-container-lowest rounded-xl p-5 border-l-4 border-error">
              <p className="text-xs uppercase font-bold text-outline">Monthly Total</p>
              <p className="text-3xl font-black">{total(matrix?.monthly)}</p>
            </div>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <MatrixCard title="Daily Matrix" bucket={matrix?.daily} />
            <MatrixCard title="Weekly Matrix" bucket={matrix?.weekly} />
            <MatrixCard title="Monthly Matrix" bucket={matrix?.monthly} />
          </section>
        </>
      )}
    </div>
  );
}
