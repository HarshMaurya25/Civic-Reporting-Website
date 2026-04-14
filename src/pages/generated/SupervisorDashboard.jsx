import React, { useEffect, useMemo, useState } from "react";
import {
  getAdminWorkerDetail,
  getSupervisorDashboard,
  getWorkerAssignedIssues,
} from "../../services/api";
import { getUser } from "../../lib/session";

function totalFromMatrix(matrix, key) {
  if (!matrix) return 0;
  return (
    (matrix.daily?.[key] || 0) +
    (matrix.weekly?.[key] || 0) +
    (matrix.monthly?.[key] || 0)
  );
}

export default function SupervisorDashboard() {
  const user = getUser();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [workerDetail, setWorkerDetail] = useState(null);
  const [workerIssues, setWorkerIssues] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

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
        const response = await getSupervisorDashboard(user.id);
        if (mounted) setData(response);
      } catch (err) {
        if (mounted)
          setError(err.message || "Failed to load supervisor dashboard.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const metrics = useMemo(() => {
    if (!data?.matrix) return { reported: 0, solved: 0, inBetween: 0 };
    return {
      reported: totalFromMatrix(data.matrix, "reported"),
      solved: totalFromMatrix(data.matrix, "solved"),
      inBetween: totalFromMatrix(data.matrix, "inBetween"),
    };
  }, [data]);

  async function openWorkerDetail(worker) {
    setSelectedWorker(worker);
    setDetailLoading(true);
    setDetailError("");
    try {
      const [detail, issues] = await Promise.all([
        getAdminWorkerDetail(worker.id).catch(() => null),
        getWorkerAssignedIssues(worker.id).catch(() => []),
      ]);
      setWorkerDetail(detail);
      setWorkerIssues(issues || []);
    } catch (err) {
      setDetailError(err.message || "Failed to load worker details.");
      setWorkerDetail(null);
      setWorkerIssues([]);
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <div className="pt-24 px-8 pb-12 space-y-8">
      <h1 className="text-3xl font-black text-primary">Supervisor Dashboard</h1>

      {loading && <p>Loading dashboard...</p>}
      {error && <p className="text-error">{error}</p>}

      {!loading && !error && data && (
        <>
          <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-surface-container-lowest p-5 rounded-xl border-l-4 border-primary">
              <p className="text-xs uppercase font-bold text-outline">
                Reported
              </p>
              <p className="text-3xl font-black">{metrics.reported}</p>
            </div>
            <div className="bg-surface-container-lowest p-5 rounded-xl border-l-4 border-secondary">
              <p className="text-xs uppercase font-bold text-outline">Solved</p>
              <p className="text-3xl font-black">{metrics.solved}</p>
            </div>
            <div className="bg-surface-container-lowest p-5 rounded-xl border-l-4 border-tertiary">
              <p className="text-xs uppercase font-bold text-outline">
                In Between
              </p>
              <p className="text-3xl font-black">{metrics.inBetween}</p>
            </div>
            <div className="bg-surface-container-lowest p-5 rounded-xl border-l-4 border-error">
              <p className="text-xs uppercase font-bold text-outline">
                Workers
              </p>
              <p className="text-3xl font-black">{data.workers?.length || 0}</p>
            </div>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <article className="bg-surface-container-lowest p-6 rounded-xl">
              <h2 className="font-bold mb-4">My Workers</h2>
              <div className="space-y-2">
                {(data.workers || []).map((worker) => (
                  <div
                    key={worker.id}
                    className="flex justify-between border-b border-outline-variant/10 pb-2 text-sm"
                  >
                    <button
                      className="font-semibold text-primary hover:underline"
                      onClick={() => openWorkerDetail(worker)}
                    >
                      {worker.fullName}
                    </button>
                    <span className="font-bold">
                      Issues: {worker.issueCount}
                    </span>
                  </div>
                ))}
                {!data.workers?.length && (
                  <p className="text-sm text-outline">No workers assigned.</p>
                )}
              </div>
            </article>

            <article className="bg-surface-container-lowest p-6 rounded-xl">
              <h2 className="font-bold mb-4">Recent Issues</h2>
              <div className="space-y-2">
                {(data.recent || []).map((issue) => (
                  <div
                    key={issue.id}
                    className="border-b border-outline-variant/10 pb-2 text-sm"
                  >
                    <p className="font-semibold">{issue.title}</p>
                    <p className="text-outline">
                      {(issue.stages || "").replaceAll("_", " ")}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          </section>

          {selectedWorker && (
            <section className="bg-surface-container-lowest p-6 rounded-xl space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="font-bold text-lg">
                  Worker Detail: {selectedWorker.fullName}
                </h2>
                <button
                  className="px-3 py-2 rounded-lg bg-surface-container-low font-semibold"
                  onClick={() => {
                    setSelectedWorker(null);
                    setWorkerDetail(null);
                    setWorkerIssues([]);
                    setDetailError("");
                  }}
                >
                  Close
                </button>
              </div>
              {detailLoading && (
                <p className="text-sm">Loading worker detail...</p>
              )}
              {detailError && (
                <p className="text-sm text-error">{detailError}</p>
              )}
              {!detailLoading && !detailError && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                    <div className="rounded-lg bg-surface-container-low p-3">
                      <p className="text-xs uppercase text-outline">
                        Full Name
                      </p>
                      <p className="font-semibold">
                        {workerDetail?.fullName || selectedWorker.fullName}
                      </p>
                    </div>
                    <div className="rounded-lg bg-surface-container-low p-3">
                      <p className="text-xs uppercase text-outline">Email</p>
                      <p className="font-semibold">
                        {workerDetail?.email || "N/A"}
                      </p>
                    </div>
                    <div className="rounded-lg bg-surface-container-low p-3">
                      <p className="text-xs uppercase text-outline">Phone</p>
                      <p className="font-semibold">
                        {workerDetail?.phoneNumber || "N/A"}
                      </p>
                    </div>
                    <div className="rounded-lg bg-surface-container-low p-3">
                      <p className="text-xs uppercase text-outline">Age</p>
                      <p className="font-semibold">
                        {workerDetail?.age || "N/A"}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold mb-2">Assigned Issues</h3>
                    <div className="space-y-2 max-h-72 overflow-auto">
                      {workerIssues.map((issue) => (
                        <div
                          key={issue.id}
                          className="rounded-lg border border-outline-variant/15 p-3 text-sm"
                        >
                          <p className="font-semibold">{issue.title}</p>
                          <p className="text-outline">
                            {issue.issueType} | {issue.criticality} |{" "}
                            {(issue.stages || "").replaceAll("_", " ")}
                          </p>
                        </div>
                      ))}
                      {!workerIssues.length && (
                        <p className="text-sm text-outline">
                          No assigned issues for this worker.
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
