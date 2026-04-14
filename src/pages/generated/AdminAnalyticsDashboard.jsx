import React, { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  getAdminAnalytics,
  getAdminIssueMatrix,
  getAdminSupervisorDetail,
  getAdminWards,
  getAdminWorkforce,
  getWardDetail,
} from "../../services/api";

function extractFeatureCollection(raw) {
  if (!raw) return null;
  if (raw?.type === "FeatureCollection" && Array.isArray(raw.features)) {
    return raw;
  }

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return extractFeatureCollection(parsed);
    } catch {
      return null;
    }
  }

  if (typeof raw === "object") {
    for (const value of Object.values(raw)) {
      const fc = extractFeatureCollection(value);
      if (fc) return fc;
    }
  }
  return null;
}

function pickWardFeature(featureCollection, ward) {
  if (!featureCollection?.features?.length || !ward) return null;
  const wardId = ward.wardId || ward.id;
  const wardName = ward.wardName || ward.name;

  return (
    featureCollection.features.find(
      (f) =>
        (f?.properties?.wardId || f?.properties?.id) === wardId ||
        (wardName &&
          (f?.properties?.wardName || f?.properties?.name) === wardName),
    ) || null
  );
}

function formatDateLabel(value) {
  if (!value) return "";
  const str = String(value);
  // expects YYYY-MM-DD
  return str.length >= 10 ? str.slice(5, 10) : str;
}

function IssueMatrixTable({ matrix }) {
  if (!matrix) return null;
  const rows = [
    { label: "Daily", bucket: matrix.daily },
    { label: "Weekly", bucket: matrix.weekly },
    { label: "Monthly", bucket: matrix.monthly },
  ];

  return (
    <div className="overflow-auto rounded-xl border border-outline-variant/15">
      <table className="w-full text-sm">
        <thead className="bg-surface-container-low">
          <tr>
            <th className="text-left px-4 py-3">Period</th>
            <th className="text-left px-4 py-3">From</th>
            <th className="text-left px-4 py-3">To</th>
            <th className="text-left px-4 py-3">Reported</th>
            <th className="text-left px-4 py-3">In Progress</th>
            <th className="text-left px-4 py-3">Solved</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-outline-variant/10">
              <td className="px-4 py-3 font-semibold">{row.label}</td>
              <td className="px-4 py-3">{row.bucket?.from || "N/A"}</td>
              <td className="px-4 py-3">{row.bucket?.to || "N/A"}</td>
              <td className="px-4 py-3">{row.bucket?.reported ?? 0}</td>
              <td className="px-4 py-3">{row.bucket?.inBetween ?? 0}</td>
              <td className="px-4 py-3">{row.bucket?.solved ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WardMiniMap({ feature }) {
  const mapNodeRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);

  useEffect(() => {
    if (!mapNodeRef.current || mapRef.current) return;

    mapRef.current = L.map(mapNodeRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([28.6139, 77.209], 12);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(mapRef.current);

    setTimeout(() => mapRef.current?.invalidateSize(), 0);

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    layerRef.current?.remove();
    layerRef.current = null;

    if (!feature) return;

    layerRef.current = L.geoJSON(feature, {
      style: {
        color: "#1d4ed8",
        weight: 2,
        fillOpacity: 0.18,
      },
    }).addTo(mapRef.current);

    try {
      mapRef.current.fitBounds(layerRef.current.getBounds().pad(0.3));
    } catch {
      // ignore
    }
  }, [feature]);

  return <div ref={mapNodeRef} className="h-56 rounded-lg" />;
}

export default function AdminAnalyticsDashboard() {
  const [data, setData] = useState(null);
  const [overallMatrix, setOverallMatrix] = useState(null);
  const [matrixError, setMatrixError] = useState("");

  const [wards, setWards] = useState([]);
  const [wardGeoJson, setWardGeoJson] = useState(null);
  const [workforce, setWorkforce] = useState(null);
  const [suppError, setSuppError] = useState("");

  const [selectedWardId, setSelectedWardId] = useState("");
  const [wardMoreOpen, setWardMoreOpen] = useState(false);
  const [wardDetail, setWardDetail] = useState(null);
  const [wardMatrix, setWardMatrix] = useState(null);
  const [wardSupervisorDetail, setWardSupervisorDetail] = useState(null);
  const [wardDetailLoading, setWardDetailLoading] = useState(false);
  const [wardDetailError, setWardDetailError] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const [response, matrix, wardData, workforceData] = await Promise.all([
          getAdminAnalytics(),
          getAdminIssueMatrix().catch(() => null),
          getAdminWards().catch(() => null),
          getAdminWorkforce().catch(() => null),
        ]);

        if (!mounted) return;
        setData(response);
        setOverallMatrix(matrix);
        setMatrixError(matrix ? "" : "Issue matrix not available.");
        setWards(wardData?.wards || []);
        setWardGeoJson(extractFeatureCollection(wardData?.geojson));
        setWorkforce(workforceData);
        setSuppError("");
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

  const selectedWard = useMemo(() => {
    if (!selectedWardId) return null;
    return wards.find((w) => (w.wardId || w.id) === selectedWardId) || null;
  }, [wards, selectedWardId]);

  const selectedWardWorkers = useMemo(() => {
    if (!workforce?.workers || !selectedWard) return [];
    const wardId = selectedWard.wardId || selectedWard.id;
    const wardName = selectedWard.wardName || selectedWard.name;
    return workforce.workers.filter((w) => {
      if (wardId && (w.wardId || w.ward?.id) === wardId) return true;
      if (wardName && w.wardName === wardName) return true;
      return false;
    });
  }, [workforce, selectedWard]);

  const selectedWardFeature = useMemo(() => {
    if (!wardGeoJson || !selectedWard) return null;
    return pickWardFeature(wardGeoJson, selectedWard);
  }, [wardGeoJson, selectedWard]);

  const openWardMoreDetail = async () => {
    if (!selectedWard) return;
    setWardMoreOpen(true);
    setWardDetailLoading(true);
    setWardDetailError("");
    setWardDetail(null);
    setWardMatrix(null);
    setWardSupervisorDetail(null);

    try {
      const wardId = selectedWard.wardId || selectedWard.id;
      const wardName = selectedWard.wardName || selectedWard.name;
      const supervisorId =
        selectedWard.supervisorId ||
        selectedWard.supervisor?.id ||
        selectedWard.supervisor?.user?.id ||
        "";

      const [detail, matrix, supervisor] = await Promise.all([
        getWardDetail(wardId, wardName).catch(() => null),
        getAdminIssueMatrix(wardId).catch(() => null),
        supervisorId
          ? getAdminSupervisorDetail(supervisorId).catch(() => null)
          : Promise.resolve(null),
      ]);

      setWardDetail(detail);
      setWardMatrix(matrix);
      setWardSupervisorDetail(supervisor);
    } catch (err) {
      setWardDetailError(err.message || "Failed to load ward detail.");
    } finally {
      setWardDetailLoading(false);
    }
  };

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

          <section className="bg-surface-container-lowest p-6 rounded-xl space-y-3">
            <h2 className="font-bold">Admin Issue Matrix</h2>
            {matrixError && (
              <p className="text-sm text-outline">{matrixError}</p>
            )}
            <IssueMatrixTable matrix={overallMatrix} />
          </section>

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

          <section className="bg-surface-container-lowest p-6 rounded-xl space-y-4">
            <h2 className="font-bold">Ward Drill-down</h2>
            {suppError && <p className="text-sm text-error">{suppError}</p>}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <select
                className="bg-surface-container-low px-3 py-2 rounded-lg"
                value={selectedWardId}
                onChange={(e) => {
                  setSelectedWardId(e.target.value);
                  setWardMoreOpen(false);
                }}
              >
                <option value="">Select ward</option>
                {wards.map((w) => (
                  <option key={w.wardId || w.id} value={w.wardId || w.id}>
                    {w.wardName || w.name}
                  </option>
                ))}
              </select>
              <div className="bg-surface-container-low px-3 py-2 rounded-lg text-sm flex items-center">
                <span className="text-outline">Supervisor:&nbsp;</span>
                <span className="font-semibold">
                  {selectedWard?.supervisorName || "Unassigned"}
                </span>
              </div>
              <button
                className="bg-primary text-white rounded-lg px-4 py-2 font-bold disabled:opacity-50"
                disabled={!selectedWard}
                onClick={openWardMoreDetail}
              >
                More detail
              </button>
            </div>

            {wardMoreOpen && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <article className="lg:col-span-2 space-y-4">
                  <div className="bg-surface-container-low rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold">Ward Map</h3>
                      <p className="text-xs text-outline">Ward-only view</p>
                    </div>
                    {selectedWardFeature ? (
                      <WardMiniMap feature={selectedWardFeature} />
                    ) : (
                      <p className="text-sm text-outline">
                        Ward GeoJSON not available for this ward.
                      </p>
                    )}
                  </div>

                  <div className="bg-surface-container-low rounded-xl p-4 space-y-3">
                    <h3 className="font-bold">Ward Issue Matrix</h3>
                    {wardDetailLoading && (
                      <p className="text-sm">Loading ward detail...</p>
                    )}
                    {wardDetailError && (
                      <p className="text-sm text-error">{wardDetailError}</p>
                    )}
                    {!wardDetailLoading && !wardDetailError && (
                      <>
                        {!wardMatrix && (
                          <p className="text-sm text-outline">
                            No matrix available for this ward.
                          </p>
                        )}
                        <IssueMatrixTable matrix={wardMatrix} />
                      </>
                    )}
                  </div>
                </article>

                <article className="space-y-4">
                  <div className="bg-surface-container-low rounded-xl p-4 space-y-2">
                    <h3 className="font-bold">Supervisor Detail</h3>
                    {wardSupervisorDetail ? (
                      <div className="text-sm space-y-1">
                        <p>
                          <span className="text-outline">Name:</span>{" "}
                          <span className="font-semibold">
                            {wardSupervisorDetail.fullName || "N/A"}
                          </span>
                        </p>
                        <p>
                          <span className="text-outline">Email:</span>{" "}
                          <span className="font-semibold">
                            {wardSupervisorDetail.email || "N/A"}
                          </span>
                        </p>
                        <p>
                          <span className="text-outline">Phone:</span>{" "}
                          <span className="font-semibold">
                            {wardSupervisorDetail.phoneNumber || "N/A"}
                          </span>
                        </p>
                        <p>
                          <span className="text-outline">Age:</span>{" "}
                          <span className="font-semibold">
                            {wardSupervisorDetail.age || "N/A"}
                          </span>
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-outline">
                        Supervisor detail not available.
                      </p>
                    )}
                  </div>

                  <div className="bg-surface-container-low rounded-xl p-4 space-y-2">
                    <h3 className="font-bold">Ward Detail</h3>
                    {wardDetail ? (
                      <div className="text-sm space-y-1">
                        <p>
                          <span className="text-outline">Ward:</span>{" "}
                          <span className="font-semibold">
                            {wardDetail.wardNumber ||
                              wardDetail.wardId ||
                              selectedWard?.wardName ||
                              "N/A"}
                          </span>
                        </p>
                        <p>
                          <span className="text-outline">Region:</span>{" "}
                          <span className="font-semibold">
                            {wardDetail.regionName ||
                              selectedWard?.region ||
                              "N/A"}
                          </span>
                        </p>
                        <p>
                          <span className="text-outline">Workers:</span>{" "}
                          <span className="font-semibold">
                            {wardDetail.workerCount ??
                              selectedWardWorkers.length}
                          </span>
                        </p>
                        <p>
                          <span className="text-outline">
                            Unfinished Issues:
                          </span>{" "}
                          <span className="font-semibold">
                            {wardDetail.unfinishedIssueCount ?? "N/A"}
                          </span>
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-outline">
                        Ward detail not available.
                      </p>
                    )}
                  </div>

                  <div className="bg-surface-container-low rounded-xl p-4 space-y-3">
                    <h3 className="font-bold">Workers</h3>
                    <div className="overflow-auto rounded-xl border border-outline-variant/15">
                      <table className="w-full text-sm">
                        <thead className="bg-surface-container-low">
                          <tr>
                            <th className="text-left px-4 py-3">Name</th>
                            <th className="text-left px-4 py-3">Started</th>
                            <th className="text-left px-4 py-3">Location</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedWardWorkers.map((w) => (
                            <tr
                              key={w.id}
                              className="border-b border-outline-variant/10"
                            >
                              <td className="px-4 py-3 font-semibold">
                                {w.username || w.fullName || w.id}
                              </td>
                              <td className="px-4 py-3">{String(w.started)}</td>
                              <td className="px-4 py-3">{w.location || ""}</td>
                            </tr>
                          ))}
                          {!selectedWardWorkers.length && (
                            <tr>
                              <td
                                className="px-4 py-3 text-outline"
                                colSpan={3}
                              >
                                No workers found for this ward.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </article>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
