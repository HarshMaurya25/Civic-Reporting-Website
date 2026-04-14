import React, { useEffect, useMemo, useState } from "react";
import {
  getAdminWorkerDetail,
  getSupervisorDashboard,
  getWorkerAssignedIssues,
} from "../../services/api";
import { getUser } from "../../lib/session";

function stageLabel(stage) {
  return (stage || "").replaceAll("_", " ");
}

export default function SupervisorWorkersPanel() {
  const user = getUser();
  const [workers, setWorkers] = useState([]);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [workerDetail, setWorkerDetail] = useState(null);
  const [workerIssues, setWorkerIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
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
        if (mounted) {
          setWorkers(response?.workers || []);
        }
      } catch (err) {
        if (mounted) {
          setError(err.message || "Failed to load workers.");
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

  async function openWorker(worker) {
    setSelectedWorker(worker);
    setDetailLoading(true);
    setDetailError("");

    try {
      const [profile, issues] = await Promise.all([
        getAdminWorkerDetail(worker.id).catch(() => null),
        getWorkerAssignedIssues(worker.id).catch(() => []),
      ]);
      setWorkerDetail(profile);
      setWorkerIssues(issues || []);
    } catch (err) {
      setDetailError(err.message || "Failed to load worker details.");
      setWorkerDetail(null);
      setWorkerIssues([]);
    } finally {
      setDetailLoading(false);
    }
  }

  const totalIssues = useMemo(
    () => workers.reduce((acc, worker) => acc + (worker.issueCount || 0), 0),
    [workers],
  );

  return (
    <div className="pt-24 px-8 pb-12 space-y-6">
      <h1 className="text-3xl font-black text-primary">Worker Operations</h1>

      {loading && <p>Loading workers...</p>}
      {error && <p className="text-error">{error}</p>}

      {!loading && !error && (
        <>
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-surface-container-lowest rounded-xl p-5 border-l-4 border-primary">
              <p className="text-xs uppercase font-bold text-outline">
                Workers
              </p>
              <p className="text-3xl font-black">{workers.length}</p>
            </div>
            <div className="bg-surface-container-lowest rounded-xl p-5 border-l-4 border-secondary">
              <p className="text-xs uppercase font-bold text-outline">
                Assigned Issues
              </p>
              <p className="text-3xl font-black">{totalIssues}</p>
            </div>
            <div className="bg-surface-container-lowest rounded-xl p-5 border-l-4 border-tertiary">
              <p className="text-xs uppercase font-bold text-outline">
                Average Load
              </p>
              <p className="text-3xl font-black">
                {workers.length
                  ? (totalIssues / workers.length).toFixed(1)
                  : "0.0"}
              </p>
            </div>
          </section>

          <section className="bg-surface-container-lowest rounded-xl overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-container-low">
                <tr>
                  <th className="text-left px-4 py-3">Worker</th>
                  <th className="text-left px-4 py-3">Open Issues</th>
                  <th className="text-left px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {workers.map((worker) => (
                  <tr
                    key={worker.id}
                    className="border-b border-outline-variant/10"
                  >
                    <td className="px-4 py-3">
                      <button
                        className="font-semibold text-primary hover:underline"
                        onClick={() => openWorker(worker)}
                      >
                        {worker.fullName}
                      </button>
                    </td>
                    <td className="px-4 py-3">{worker.issueCount || 0}</td>
                    <td className="px-4 py-3">
                      <button
                        className="px-3 py-1 rounded-lg bg-surface-container-low font-semibold"
                        onClick={() => openWorker(worker)}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
                {!workers.length && (
                  <tr>
                    <td className="px-4 py-5 text-outline" colSpan={3}>
                      No workers assigned to this supervisor.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>

          {selectedWorker && (
            <section className="bg-surface-container-lowest rounded-xl p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">
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

              {detailLoading && <p>Loading worker detail...</p>}
              {detailError && <p className="text-error">{detailError}</p>}

              {!detailLoading && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                    <div className="bg-surface-container-low rounded-lg p-3">
                      <p className="text-xs text-outline uppercase">Name</p>
                      <p className="font-semibold">
                        {workerDetail?.fullName || selectedWorker.fullName}
                      </p>
                    </div>
                    <div className="bg-surface-container-low rounded-lg p-3">
                      <p className="text-xs text-outline uppercase">Email</p>
                      <p className="font-semibold">
                        {workerDetail?.email || "N/A"}
                      </p>
                    </div>
                    <div className="bg-surface-container-low rounded-lg p-3">
                      <p className="text-xs text-outline uppercase">Phone</p>
                      <p className="font-semibold">
                        {workerDetail?.phoneNumber || "N/A"}
                      </p>
                    </div>
                    <div className="bg-surface-container-low rounded-lg p-3">
                      <p className="text-xs text-outline uppercase">Age</p>
                      <p className="font-semibold">
                        {workerDetail?.age || "N/A"}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold mb-3">Assigned Issues</h3>
                    <div className="space-y-2 max-h-80 overflow-auto">
                      {workerIssues.map((issue) => (
                        <div
                          key={issue.id}
                          className="rounded-lg border border-outline-variant/15 p-3 text-sm"
                        >
                          <p className="font-semibold">{issue.title}</p>
                          <p className="text-outline">
                            {issue.issueType} | {issue.criticality}
                          </p>
                          <p className="text-outline">
                            Stage: {stageLabel(issue.stages)}
                          </p>
                        </div>
                      ))}
                      {!workerIssues.length && (
                        <p className="text-sm text-outline">
                          No assigned issues found for this worker.
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
