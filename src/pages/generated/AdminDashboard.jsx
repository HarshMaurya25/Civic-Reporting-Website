import React, { useEffect, useMemo, useState } from "react";
import {
  getAdminCitizenDetail,
  getAdminDashboard,
  getTopWards,
} from "../../services/api";

function sumMatrix(matrix, key) {
  if (!matrix) return 0;
  return (
    (matrix.daily?.[key] || 0) +
    (matrix.weekly?.[key] || 0) +
    (matrix.monthly?.[key] || 0)
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCitizen, setSelectedCitizen] = useState(null);
  const [citizenDetail, setCitizenDetail] = useState(null);
  const [detailError, setDetailError] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);
  const [topWards, setTopWards] = useState([]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const [response, wards] = await Promise.all([
          getAdminDashboard(),
          getTopWards().catch(() => []),
        ]);
        if (mounted) {
          setData(response);
          setTopWards(wards);
        }
      } catch (err) {
        if (mounted) setError(err.message || "Failed to load dashboard.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const metrics = useMemo(() => {
    if (!data) return null;
    const totalReported = sumMatrix(data.issueMatrix, "reported");
    const totalSolved = sumMatrix(data.issueMatrix, "solved");
    const inBetween = sumMatrix(data.issueMatrix, "inBetween");

    return {
      totalReported,
      totalSolved,
      inBetween,
      workers: data.workers?.length || 0,
      supervisors: data.supervisors?.length || 0,
    };
  }, [data]);

  async function openCitizenDetail(item) {
    setSelectedCitizen(item);
    setCitizenDetail(null);
    setDetailError("");

    const citizenId = item?.id || item?.userId;
    if (!citizenId) {
      setDetailError(
        "Citizen detail ID is missing in leaderboard response for this user.",
      );
      return;
    }

    setDetailLoading(true);
    try {
      const detail = await getAdminCitizenDetail(citizenId);
      setCitizenDetail(detail);
    } catch (err) {
      setDetailError(err.message || "Failed to load citizen details.");
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <div className="pt-24 px-8 pb-12 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-black text-primary">Command Center</h1>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-xl bg-surface-container-high text-sm font-bold"
        >
          Refresh
        </button>
      </div>

      {loading && (
        <p className="text-on-surface-variant">Loading dashboard...</p>
      )}
      {error && <p className="text-error">{error}</p>}

      {!loading && !error && metrics && (
        <>
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-surface-container-lowest rounded-xl p-5 border-l-4 border-primary">
              <p className="text-xs uppercase font-bold text-outline">
                Reported
              </p>
              <p className="text-3xl font-black">{metrics.totalReported}</p>
            </div>
            <div className="bg-surface-container-lowest rounded-xl p-5 border-l-4 border-secondary">
              <p className="text-xs uppercase font-bold text-outline">Solved</p>
              <p className="text-3xl font-black">{metrics.totalSolved}</p>
            </div>
            <div className="bg-surface-container-lowest rounded-xl p-5 border-l-4 border-tertiary">
              <p className="text-xs uppercase font-bold text-outline">
                In Progress
              </p>
              <p className="text-3xl font-black">{metrics.inBetween}</p>
            </div>
            <div className="bg-surface-container-lowest rounded-xl p-5 border-l-4 border-primary-container">
              <p className="text-xs uppercase font-bold text-outline">
                Workers
              </p>
              <p className="text-3xl font-black">{metrics.workers}</p>
            </div>
            <div className="bg-surface-container-lowest rounded-xl p-5 border-l-4 border-secondary-container">
              <p className="text-xs uppercase font-bold text-outline">
                Supervisors
              </p>
              <p className="text-3xl font-black">{metrics.supervisors}</p>
            </div>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <article className="bg-surface-container-lowest rounded-xl p-6">
              <h2 className="font-bold text-lg mb-4">Weekly Stage Breakdown</h2>
              <div className="space-y-3">
                {(data.weeklyStages || []).map((item) => (
                  <div
                    key={item.stage}
                    className="flex justify-between text-sm border-b border-outline-variant/10 pb-2"
                  >
                    <span>{(item.stage || "").replaceAll("_", " ")}</span>
                    <span className="font-bold">{item.count}</span>
                  </div>
                ))}
                {!data.weeklyStages?.length && (
                  <p className="text-sm text-outline">
                    No stage stats available.
                  </p>
                )}
              </div>
            </article>

            <article className="bg-surface-container-lowest rounded-xl p-6">
              <h2 className="font-bold text-lg mb-4">Recent Issues</h2>
              <div className="space-y-3">
                {(data.recent || []).map((issue) => (
                  <div
                    key={issue.id}
                    className="rounded-lg border border-outline-variant/15 p-3"
                  >
                    <p className="font-bold text-sm">{issue.title}</p>
                    <p className="text-xs text-outline mt-1">
                      {(issue.stages || "").replaceAll("_", " ")} |{" "}
                      {new Date(issue.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
                {!data.recent?.length && (
                  <p className="text-sm text-outline">
                    No recent issues found.
                  </p>
                )}
              </div>
            </article>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <article className="bg-surface-container-lowest rounded-xl p-6">
              <h2 className="font-bold text-lg mb-4">
                Top Wards by Efficiency
              </h2>
              <div className="space-y-2">
                {(topWards || []).map((ward, index) => (
                  <div
                    key={ward.wardName}
                    className="flex justify-between items-center rounded-lg border border-outline-variant/15 p-3"
                  >
                    <div>
                      <div className="font-semibold text-primary">
                        #{index + 1} {ward.wardName}
                      </div>
                      <p className="text-[10px] text-outline uppercase font-bold">
                        Sup: {ward.supervisorName || "N/A"}
                      </p>
                    </div>
                    <span className="font-black text-sm">
                      {ward.points.toFixed(1)} Pts
                    </span>
                  </div>
                ))}
                {!topWards?.length && (
                  <p className="text-sm text-outline">
                    No top ward data found.
                  </p>
                )}
              </div>
            </article>
            <article className="bg-surface-container-lowest rounded-xl p-6">
              <h2 className="font-bold text-lg mb-4">Citizen Ranking</h2>
              <div className="space-y-2">
                {(data.leaderboard || []).slice(0, 5).map((citizen, index) => (
                  <div
                    key={`${citizen.fullName}-${index}`}
                    className="flex justify-between items-center rounded-lg border border-outline-variant/15 p-3"
                  >
                    <button
                      onClick={() => openCitizenDetail(citizen)}
                      className="font-semibold text-primary hover:underline text-left"
                    >
                      #{index + 1} {citizen.fullName || "Unknown Citizen"}
                    </button>
                    <span className="font-black">{citizen.score ?? 0}</span>
                  </div>
                ))}
                {!data.leaderboard?.length && (
                  <p className="text-sm text-outline">
                    No citizen ranking data found.
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
