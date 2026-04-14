import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  Cell,
  Legend,
} from "recharts";
import {
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

function pickWardFeature(featureCollection, wardId, wardName) {
  if (!featureCollection?.features?.length) return null;
  return (
    featureCollection.features.find(
      (f) =>
        (wardId && (f?.properties?.wardId || f?.properties?.id) === wardId) ||
        (wardName &&
          (f?.properties?.wardName || f?.properties?.name) === wardName),
    ) || null
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
            <th className="text-left px-4 py-3">Reported</th>
            <th className="text-left px-4 py-3">In Progress</th>
            <th className="text-left px-4 py-3">Solved</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-outline-variant/10">
              <td className="px-4 py-3 font-semibold">{row.label}</td>
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

export default function AdminSupervisorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [workforce, setWorkforce] = useState(null);
  const [supervisorProfile, setSupervisorProfile] = useState(null);

  const [wardGeoJson, setWardGeoJson] = useState(null);
  const [wardDetail, setWardDetail] = useState(null);
  const [wardMatrix, setWardMatrix] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const [wf, wardsData, profile] = await Promise.all([
          getAdminWorkforce(),
          getAdminWards().catch(() => null),
          getAdminSupervisorDetail(id),
        ]);

        if (!mounted) return;

        setWorkforce(wf);
        setWardGeoJson(extractFeatureCollection(wardsData?.geojson));
        setSupervisorProfile(profile);

        const supervisorRow = (wf?.supervisors || []).find((s) => s.id === id);
        const wardId = supervisorRow?.wardId || "";
        const wardName = supervisorRow?.wardName || "";

        const [wd, matrix] = await Promise.all([
          wardId || wardName
            ? getWardDetail(wardId || undefined, wardName || undefined).catch(
                () => null,
              )
            : Promise.resolve(null),
          wardId
            ? getAdminIssueMatrix(wardId).catch(() => null)
            : Promise.resolve(null),
        ]);

        if (!mounted) return;
        setWardDetail(wd);
        setWardMatrix(matrix);
      } catch (err) {
        if (mounted)
          setError(err.message || "Failed to load supervisor detail.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [id]);

  const supervisorRow = useMemo(() => {
    return (workforce?.supervisors || []).find((s) => s.id === id) || null;
  }, [workforce, id]);

  const workersUnder = useMemo(() => {
    if (!workforce?.workers?.length) return [];
    return workforce.workers.filter((w) => w.supervisorId === id);
  }, [workforce, id]);

  const wardFeature = useMemo(() => {
    if (!wardGeoJson) return null;
    const wardId = supervisorRow?.wardId || "";
    const wardName = supervisorRow?.wardName || "";
    return pickWardFeature(wardGeoJson, wardId, wardName);
  }, [wardGeoJson, supervisorRow]);

  const pieData = useMemo(() => {
    const bucket =
      wardMatrix?.monthly || wardMatrix?.weekly || wardMatrix?.daily;
    if (!bucket) return [];
    return [
      { name: "Reported", value: bucket.reported ?? 0 },
      { name: "In Progress", value: bucket.inBetween ?? 0 },
      { name: "Solved", value: bucket.solved ?? 0 },
    ];
  }, [wardMatrix]);

  const colors = ["#1d4ed8", "#f59e0b", "#16a34a"];

  return (
    <div className="pt-24 px-8 pb-12 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-black text-primary">Supervisor Detail</h1>
        <button
          className="px-4 py-2 rounded-lg bg-surface-container-lowest font-bold"
          onClick={() => navigate("/admin/workforce")}
        >
          Back
        </button>
      </div>

      {loading && <p>Loading supervisor...</p>}
      {error && <p className="text-error">{error}</p>}

      {!loading && !error && (
        <>
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <article className="bg-surface-container-lowest rounded-xl p-5 space-y-4">
              <h2 className="font-bold">Personal Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="bg-surface-container-low rounded-lg p-3">
                  <p className="text-xs uppercase text-outline">Name</p>
                  <p className="font-semibold">
                    {supervisorProfile?.fullName ||
                      supervisorRow?.username ||
                      "N/A"}
                  </p>
                </div>
                <div className="bg-surface-container-low rounded-lg p-3">
                  <p className="text-xs uppercase text-outline">Email</p>
                  <p className="font-semibold">
                    {supervisorProfile?.email || "N/A"}
                  </p>
                </div>
                <div className="bg-surface-container-low rounded-lg p-3">
                  <p className="text-xs uppercase text-outline">Phone</p>
                  <p className="font-semibold">
                    {supervisorProfile?.phoneNumber || "N/A"}
                  </p>
                </div>
                <div className="bg-surface-container-low rounded-lg p-3">
                  <p className="text-xs uppercase text-outline">Age</p>
                  <p className="font-semibold">
                    {supervisorProfile?.age || "N/A"}
                  </p>
                </div>
                <div className="bg-surface-container-low rounded-lg p-3">
                  <p className="text-xs uppercase text-outline">Ward</p>
                  <p className="font-semibold">
                    {supervisorRow?.wardName || "N/A"}
                  </p>
                </div>
                <div className="bg-surface-container-low rounded-lg p-3">
                  <p className="text-xs uppercase text-outline">Started</p>
                  <p className="font-semibold">
                    {String(supervisorRow?.started)}
                  </p>
                </div>
              </div>
            </article>

            <article className="lg:col-span-2 bg-surface-container-lowest rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold">Ward Map</h2>
                <p className="text-xs text-outline">Ward-only view</p>
              </div>
              {wardFeature ? (
                <WardMiniMap feature={wardFeature} />
              ) : (
                <p className="text-sm text-outline">
                  Ward polygon not available.
                </p>
              )}
            </article>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <article className="bg-surface-container-lowest rounded-xl p-5 space-y-4">
              <h2 className="font-bold">Ward Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="bg-surface-container-low rounded-lg p-3">
                  <p className="text-xs uppercase text-outline">Ward</p>
                  <p className="font-semibold">
                    {wardDetail?.wardNumber || supervisorRow?.wardName || "N/A"}
                  </p>
                </div>
                <div className="bg-surface-container-low rounded-lg p-3">
                  <p className="text-xs uppercase text-outline">Region</p>
                  <p className="font-semibold">
                    {wardDetail?.regionName || "N/A"}
                  </p>
                </div>
                <div className="bg-surface-container-low rounded-lg p-3">
                  <p className="text-xs uppercase text-outline">Workers</p>
                  <p className="font-semibold">
                    {wardDetail?.workerCount ?? workersUnder.length}
                  </p>
                </div>
                <div className="bg-surface-container-low rounded-lg p-3">
                  <p className="text-xs uppercase text-outline">
                    Unfinished Issues
                  </p>
                  <p className="font-semibold">
                    {wardDetail?.unfinishedIssueCount ?? "N/A"}
                  </p>
                </div>
              </div>

              <h3 className="font-bold pt-2">Ward Issue Matrix</h3>
              <IssueMatrixTable matrix={wardMatrix} />
            </article>

            <article className="bg-surface-container-lowest rounded-xl p-5 space-y-4">
              <h2 className="font-bold">Ward Pie Chart</h2>
              {!pieData.length ? (
                <p className="text-sm text-outline">No matrix data to chart.</p>
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label
                      >
                        {pieData.map((_, index) => (
                          <Cell
                            key={index}
                            fill={colors[index % colors.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </article>
          </section>

          <section className="bg-surface-container-lowest rounded-xl overflow-auto">
            <div className="p-4 border-b border-outline-variant/10">
              <h2 className="font-bold">Workers Under Supervisor</h2>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-surface-container-low">
                <tr>
                  <th className="text-left px-4 py-3">Name</th>
                  <th className="text-left px-4 py-3">Ward</th>
                  <th className="text-left px-4 py-3">Started</th>
                  <th className="text-left px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {workersUnder.map((w) => (
                  <tr key={w.id} className="border-b border-outline-variant/10">
                    <td className="px-4 py-3 font-semibold">{w.username}</td>
                    <td className="px-4 py-3">{w.wardName || "N/A"}</td>
                    <td className="px-4 py-3">{String(w.started)}</td>
                    <td className="px-4 py-3">
                      <button
                        className="text-primary font-semibold hover:underline"
                        onClick={() =>
                          navigate(`/admin/workforce/worker/${w.id}`)
                        }
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
                {!workersUnder.length && (
                  <tr>
                    <td className="px-4 py-3 text-outline" colSpan={4}>
                      No workers assigned.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}
