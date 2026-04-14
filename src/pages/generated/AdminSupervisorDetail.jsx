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
    }).setView([28.6139, 77.209], 11);

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

const PIE_COLORS = ["#1d4ed8", "#f59e0b", "#16a34a"];

function MiniPie({ title, data, hasData }) {
  if (!hasData) {
    return (
      <div className="bg-surface-container-low rounded-xl p-4 flex flex-col items-center justify-center min-h-[220px]">
        <p className="text-[10px] uppercase font-bold text-outline tracking-widest mb-3">{title}</p>
        <div className="w-28 h-28 rounded-full border-[6px] border-outline-variant/20 flex items-center justify-center">
          <span className="text-xs font-bold text-outline">No Data</span>
        </div>
      </div>
    );
  }
  return (
    <div className="bg-surface-container-low rounded-xl p-4 min-h-[220px]">
      <p className="text-[10px] uppercase font-bold text-outline tracking-widest mb-2 text-center">{title}</p>
      <ResponsiveContainer width="100%" height={170}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" outerRadius={60} innerRadius={28} label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
            {data.map((e, i) => <Cell key={e.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
          </Pie>
          <Tooltip />
          <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
        </PieChart>
      </ResponsiveContainer>
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

  const wardFeature = useMemo(() => {
    if (!wardGeoJson) return null;
    const wardId = supervisorRow?.wardId || "";
    const wardName = supervisorRow?.wardName || "";
    return pickWardFeature(wardGeoJson, wardId, wardName);
  }, [wardGeoJson, supervisorRow]);

  const makePieData = (bucket) => {
    if (!bucket) return [];
    return [
      { name: "Reported", value: bucket.reported ?? 0 },
      { name: "In Progress", value: bucket.inBetween ?? 0 },
      { name: "Solved", value: bucket.solved ?? 0 },
    ];
  };

  const dailyPie = useMemo(() => makePieData(wardMatrix?.daily), [wardMatrix]);
  const weeklyPie = useMemo(() => makePieData(wardMatrix?.weekly), [wardMatrix]);
  const monthlyPie = useMemo(() => makePieData(wardMatrix?.monthly), [wardMatrix]);
  const hasDailyData = dailyPie.some((d) => d.value > 0);
  const hasWeeklyData = weeklyPie.some((d) => d.value > 0);
  const hasMonthlyData = monthlyPie.some((d) => d.value > 0);

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
              <div className="grid grid-cols-1 gap-3 text-sm">
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
                  <p className="font-semibold break-all">
                    {supervisorProfile?.email || "N/A"}
                  </p>
                </div>
                <div className="bg-surface-container-low rounded-lg p-3">
                  <p className="text-xs uppercase text-outline">Phone</p>
                  <p className="font-semibold">
                    {supervisorProfile?.phoneNumber || "N/A"}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-surface-container-low rounded-lg p-3">
                    <p className="text-xs uppercase text-outline">Age</p>
                    <p className="font-semibold">
                      {supervisorProfile?.age || "N/A"}
                    </p>
                  </div>
                  <div className="bg-surface-container-low rounded-lg p-3">
                    <p className="text-xs uppercase text-outline">Ward</p>
                    <p className="font-semibold">
                      {supervisorRow?.wardName || "Unassigned"}
                    </p>
                  </div>
                </div>
                <div className="bg-surface-container-low rounded-lg p-3">
                  <p className="text-xs uppercase text-outline">Status</p>
                  <p className="font-semibold">
                    {supervisorRow?.started ? "Active" : "Not started"}
                  </p>
                </div>
              </div>
            </article>

            <article className="lg:col-span-2 bg-surface-container-lowest rounded-xl p-5 space-y-4">
              <h2 className="font-bold">Ward Map</h2>
              {wardFeature ? (
                <WardMiniMap feature={wardFeature} />
              ) : (
                <div className="h-56 rounded-xl bg-surface-container-low flex items-center justify-center">
                  <p className="text-sm text-outline">
                    Ward polygon not available.
                  </p>
                </div>
              )}
            </article>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <article className="bg-surface-container-lowest rounded-xl p-5 space-y-4">
              <h2 className="font-bold">Ward Details</h2>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-surface-container-low rounded-lg p-3">
                  <p className="text-xs uppercase text-outline">Ward</p>
                  <p className="font-semibold">
                    {wardDetail?.wardNumber || supervisorRow?.wardName || "N/A"}
                  </p>
                </div>
                <div className="bg-surface-container-low rounded-lg p-3">
                  <p className="text-xs uppercase text-outline">Workers</p>
                  <p className="font-semibold">
                    {wardDetail?.workerCount ?? 0}
                  </p>
                </div>
                <div className="bg-surface-container-low rounded-lg p-3">
                  <p className="text-xs uppercase text-outline">
                    Open Issues
                  </p>
                  <p className="font-semibold">
                    {wardDetail?.unfinishedIssueCount ?? 0}
                  </p>
                </div>
                <div className="bg-surface-container-low rounded-lg p-3">
                  <p className="text-xs uppercase text-outline">Region</p>
                  <p className="font-semibold">
                    {wardDetail?.regionName || supervisorRow?.location || "N/A"}
                  </p>
                </div>
              </div>
            </article>

            <article className="bg-surface-container-lowest rounded-xl p-5 space-y-4">
              <h2 className="font-bold">Issue Statistics</h2>
              <div className="grid grid-cols-3 gap-3">
                <MiniPie title="Daily" data={dailyPie} hasData={hasDailyData} />
                <MiniPie title="Weekly" data={weeklyPie} hasData={hasWeeklyData} />
                <MiniPie title="Monthly" data={monthlyPie} hasData={hasMonthlyData} />
              </div>
            </article>
          </section>
        </>
      )}
    </div>
  );
}
