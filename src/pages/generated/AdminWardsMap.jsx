import React, { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  getAdminMapIssues,
  getAdminWards,
  getIssueDetail,
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
    const values = Object.values(raw);
    for (const value of values) {
      const fc = extractFeatureCollection(value);
      if (fc) return fc;
    }
  }

  return null;
}

function safeParseJson(value) {
  if (!value) return null;
  if (typeof value === "object") return value;
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function wardFromFeatureProps(props, wards) {
  if (!props) return null;
  const wardId = props.wardId || props.id;
  const wardName = props.wardName || props.name;
  if (wardId) {
    const hit = wards.find((w) => (w.wardId || w.id) === wardId);
    if (hit) return hit;
  }
  if (wardName) {
    const hit = wards.find((w) => (w.wardName || w.name) === wardName);
    if (hit) return hit;
  }
  return {
    wardId,
    wardName,
    name: wardName,
    region: props.region,
    supervisorId: props.supervisorId,
    supervisorName: props.supervisorName,
  };
}

function markerColor(criticality) {
  if (criticality === "HIGH") return "#dc2626";
  if (criticality === "MEDIUM") return "#f59e0b";
  return "#22c55e";
}

function hotspotKey(issue) {
  return `${Number(issue.latitude).toFixed(2)}:${Number(issue.longitude).toFixed(2)}`;
}

function criticalityRank(value) {
  if (value === "HIGH") return 3;
  if (value === "MEDIUM") return 2;
  return 1;
}

export default function AdminWardsMap() {
  const mapRef = useRef(null);
  const mapNodeRef = useRef(null);
  const issueLayerRef = useRef(null);
  const wardLayerRef = useRef(null);

  const [wards, setWards] = useState([]);
  const [wardGeoJson, setWardGeoJson] = useState(null);
  const [issues, setIssues] = useState([]);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [selectedIssueDetail, setSelectedIssueDetail] = useState(null);
  const [selectedWard, setSelectedWard] = useState(null);
  const [selectedWardDetail, setSelectedWardDetail] = useState(null);

  const [criticalityFilter, setCriticalityFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [stageFilter, setStageFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("criticality");
  const [hotspotOnly, setHotspotOnly] = useState(false);
  const [showWards, setShowWards] = useState(true);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const [wardData, mapIssues] = await Promise.all([
          getAdminWards(),
          getAdminMapIssues().catch(() => []),
        ]);
        if (mounted) {
          setWards(wardData.wards || []);
          setWardGeoJson(extractFeatureCollection(wardData.geojson));
          setIssues(mapIssues || []);
        }
      } catch (err) {
        if (mounted) {
          setError(err.message || "Failed to load admin map data.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const hotspotCountMap = useMemo(() => {
    return issues.reduce((acc, issue) => {
      const key = hotspotKey(issue);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }, [issues]);

  const hotspots = useMemo(() => {
    return Object.entries(hotspotCountMap)
      .filter(([, count]) => count >= 2)
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count);
  }, [hotspotCountMap]);

  const filteredIssues = useMemo(() => {
    return issues
      .filter((issue) => {
        if (
          criticalityFilter !== "ALL" &&
          issue.criticality !== criticalityFilter
        )
          return false;
        if (typeFilter !== "ALL" && issue.issueType !== typeFilter)
          return false;
        if (stageFilter !== "ALL" && issue.stages !== stageFilter) return false;
        if (hotspotOnly && (hotspotCountMap[hotspotKey(issue)] || 0) < 2)
          return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "criticality")
          return (
            criticalityRank(b.criticality) - criticalityRank(a.criticality)
          );
        if (sortBy === "issueType")
          return (a.issueType || "").localeCompare(b.issueType || "");
        if (sortBy === "hotspot")
          return (
            (hotspotCountMap[hotspotKey(b)] || 0) -
            (hotspotCountMap[hotspotKey(a)] || 0)
          );
        return 0;
      });
  }, [
    issues,
    criticalityFilter,
    typeFilter,
    stageFilter,
    sortBy,
    hotspotOnly,
    hotspotCountMap,
  ]);

  useEffect(() => {
    if (!mapNodeRef.current || mapRef.current) return;

    mapRef.current = L.map(mapNodeRef.current).setView([28.6139, 77.209], 11);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(mapRef.current);

    setTimeout(() => mapRef.current?.invalidateSize(), 0);

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    issueLayerRef.current?.remove();
    issueLayerRef.current = L.layerGroup();

    filteredIssues.forEach((issue) => {
      const marker = L.circleMarker([issue.latitude, issue.longitude], {
        radius: 8,
        color: markerColor(issue.criticality),
        fillColor: markerColor(issue.criticality),
        fillOpacity: 0.78,
      });

      marker.bindPopup(
        `<strong>${issue.issueType}</strong><br/>${issue.criticality}<br/>${(issue.stages || "").replaceAll("_", " ")}`,
      );

      marker.on("click", async () => {
        setSelectedIssue(issue);
        try {
          const detail = await getIssueDetail(issue.id);
          setSelectedIssueDetail(detail);
        } catch {
          setSelectedIssueDetail(null);
        }
      });

      issueLayerRef.current.addLayer(marker);
    });

    issueLayerRef.current.addTo(mapRef.current);

    if (filteredIssues.length) {
      const bounds = L.latLngBounds(
        filteredIssues.map((issue) => [issue.latitude, issue.longitude]),
      );
      mapRef.current.fitBounds(bounds.pad(0.2));
    }
  }, [filteredIssues]);

  useEffect(() => {
    if (!mapRef.current) return;

    wardLayerRef.current?.remove();

    if (!showWards) {
      wardLayerRef.current = L.layerGroup().addTo(mapRef.current);
      return;
    }

    // Prefer the official GeoJSON export endpoint.
    if (wardGeoJson) {
      wardLayerRef.current = L.geoJSON(wardGeoJson, {
        style: {
          color: "#1d4ed8",
          weight: 2,
          fillOpacity: 0.12,
        },
        onEachFeature: (feature, layer) => {
          const ward = wardFromFeatureProps(feature?.properties, wards);
          const name = ward?.wardName || ward?.name || "Ward";
          const region = ward?.region || "Unknown region";
          const supervisor =
            ward?.supervisorName ||
            ward?.supervisor?.user?.fullName ||
            "Unassigned";

          layer.bindPopup(
            `<strong>${name}</strong><br/>${region}<br/>${supervisor}`,
          );

          layer.on("click", async () => {
            if (!ward) return;
            setSelectedWard(ward);
            try {
              const detail = await getWardDetail(
                ward.wardId || ward.id,
                ward.wardName || ward.name,
              );
              setSelectedWardDetail(detail);
            } catch {
              setSelectedWardDetail(null);
            }
          });
        },
      }).addTo(mapRef.current);

      return;
    }

    // Fallback: try parsing `boundary` if backend sends JSON strings.
    wardLayerRef.current = L.layerGroup();
    wards.forEach((ward) => {
      const parsed = safeParseJson(ward.boundary);
      const geometry =
        parsed?.type === "Feature"
          ? parsed
          : parsed?.type
            ? { type: "Feature", properties: {}, geometry: parsed }
            : null;
      if (!geometry) return;

      const geo = L.geoJSON(geometry, {
        style: {
          color: "#1d4ed8",
          weight: 2,
          fillOpacity: 0.12,
        },
      });

      geo.eachLayer((layer) => {
        layer.bindPopup(
          `<strong>${ward.wardName || ward.name || "Ward"}</strong><br/>${ward.region || "Unknown region"}<br/>${ward.supervisorName || "Unassigned"}`,
        );
        layer.on("click", async () => {
          setSelectedWard(ward);
          try {
            const detail = await getWardDetail(
              ward.wardId || ward.id,
              ward.wardName || ward.name,
            );
            setSelectedWardDetail(detail);
          } catch {
            setSelectedWardDetail(null);
          }
        });
      });

      wardLayerRef.current.addLayer(geo);
    });

    wardLayerRef.current.addTo(mapRef.current);
  }, [wards, wardGeoJson, showWards]);

  return (
    <div className="pt-24 px-8 pb-12 space-y-6">
      <h1 className="text-3xl font-black text-primary">
        Admin Ward Intelligence Map
      </h1>

      {loading && <p>Loading map data...</p>}
      {error && <p className="text-error">{error}</p>}

      {!loading && !error && (
        <>
          <section className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <select
              className="bg-surface-container-lowest px-3 py-2 rounded-lg"
              value={criticalityFilter}
              onChange={(e) => setCriticalityFilter(e.target.value)}
            >
              <option value="ALL">All Criticality</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>
            <select
              className="bg-surface-container-lowest px-3 py-2 rounded-lg"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="ALL">All Issue Types</option>
              <option value="POTHOLE">POTHOLE</option>
              <option value="DRAINAGE_SEWER">DRAINAGE_SEWER</option>
              <option value="WASTE_MANAGEMENT">WASTE_MANAGEMENT</option>
              <option value="INFRASTRUCTURE">INFRASTRUCTURE</option>
              <option value="ENCROACHMENT">ENCROACHMENT</option>
              <option value="OTHER">OTHER</option>
            </select>
            <select
              className="bg-surface-container-lowest px-3 py-2 rounded-lg"
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
            >
              <option value="ALL">All Stages</option>
              <option value="PENDING">PENDING</option>
              <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
              <option value="TEAM_ASSIGNED">TEAM_ASSIGNED</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="RESOLVED">RESOLVED</option>
              <option value="RECONSIDERED">RECONSIDERED</option>
            </select>
            <div className="flex gap-2">
              <select
                className="bg-surface-container-lowest px-3 py-2 rounded-lg flex-1"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="criticality">Sort by Criticality</option>
                <option value="issueType">Sort by Issue Type</option>
                <option value="hotspot">Sort by Hotspot Density</option>
              </select>
              <button
                className={`px-3 py-2 rounded-lg font-semibold ${hotspotOnly ? "bg-primary text-white" : "bg-surface-container-low"}`}
                onClick={() => setHotspotOnly((v) => !v)}
              >
                Hotspots
              </button>
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-surface-container-lowest p-5 rounded-xl border-l-4 border-primary">
              <p className="text-xs uppercase font-bold text-outline">
                Visible Issues
              </p>
              <p className="text-3xl font-black">{filteredIssues.length}</p>
            </div>
            <div className="bg-surface-container-lowest p-5 rounded-xl border-l-4 border-secondary">
              <p className="text-xs uppercase font-bold text-outline">Wards</p>
              <p className="text-3xl font-black">{wards.length}</p>
            </div>
            <div className="bg-surface-container-lowest p-5 rounded-xl border-l-4 border-tertiary">
              <p className="text-xs uppercase font-bold text-outline">
                Hotspots
              </p>
              <p className="text-3xl font-black">{hotspots.length}</p>
            </div>
            <div className="bg-surface-container-lowest p-5 rounded-xl border-l-4 border-error">
              <p className="text-xs uppercase font-bold text-outline">
                Ward Overlay
              </p>
              <button
                className="mt-1 px-3 py-2 rounded-lg bg-surface-container-high font-semibold"
                onClick={() => setShowWards((value) => !value)}
              >
                {showWards ? "Hide" : "Show"} Wards
              </button>
            </div>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <article className="lg:col-span-2 bg-surface-container-lowest rounded-xl p-3">
              <div ref={mapNodeRef} className="h-[560px] rounded-lg" />
            </article>

            <article className="bg-surface-container-lowest rounded-xl p-4 space-y-3">
              <h2 className="font-bold">Ward Detail</h2>
              {!selectedWard && (
                <p className="text-sm text-outline">
                  Click a ward polygon to inspect ward details.
                </p>
              )}
              {selectedWard && (
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="font-semibold">Ward:</span>{" "}
                    {selectedWard.wardName || selectedWard.name || "N/A"}
                  </p>
                  <p>
                    <span className="font-semibold">Region:</span>{" "}
                    {selectedWard.region || "N/A"}
                  </p>
                  <p>
                    <span className="font-semibold">Supervisor:</span>{" "}
                    {selectedWard.supervisorName ||
                      selectedWard.supervisor?.user?.fullName ||
                      "Unassigned"}
                  </p>
                  {selectedWardDetail && (
                    <>
                      <p>
                        <span className="font-semibold">Ward Number:</span>{" "}
                        {selectedWardDetail.wardNumber || "N/A"}
                      </p>
                      <p>
                        <span className="font-semibold">Worker Count:</span>{" "}
                        {selectedWardDetail.workerCount ?? "N/A"}
                      </p>
                      <p>
                        <span className="font-semibold">
                          Unfinished Issues:
                        </span>{" "}
                        {selectedWardDetail.unfinishedIssueCount ?? "N/A"}
                      </p>
                      <p>
                        <span className="font-semibold">Supervisor Email:</span>{" "}
                        {selectedWardDetail.supervisorEmail || "N/A"}
                      </p>
                      <p>
                        <span className="font-semibold">Supervisor Phone:</span>{" "}
                        {selectedWardDetail.supervisorPhoneNumber || "N/A"}
                      </p>
                    </>
                  )}
                </div>
              )}

              <h2 className="font-bold pt-2">Issue Detail</h2>
              {!selectedIssue && (
                <p className="text-sm text-outline">
                  Click a marker to inspect issue details.
                </p>
              )}
              {selectedIssue && (
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="font-semibold">Issue ID:</span>{" "}
                    {selectedIssue.id}
                  </p>
                  <p>
                    <span className="font-semibold">Type:</span>{" "}
                    {selectedIssue.issueType}
                  </p>
                  <p>
                    <span className="font-semibold">Criticality:</span>{" "}
                    {selectedIssue.criticality}
                  </p>
                  <p>
                    <span className="font-semibold">Stage:</span>{" "}
                    {(selectedIssue.stages || "").replaceAll("_", " ")}
                  </p>
                  {selectedIssueDetail && (
                    <>
                      <p>
                        <span className="font-semibold">Title:</span>{" "}
                        {selectedIssueDetail.title || "N/A"}
                      </p>
                      <p>
                        <span className="font-semibold">Location:</span>{" "}
                        {selectedIssueDetail.location || "N/A"}
                      </p>
                      <p>
                        <span className="font-semibold">Description:</span>{" "}
                        {selectedIssueDetail.description || "N/A"}
                      </p>
                    </>
                  )}
                </div>
              )}

              <h3 className="font-bold pt-2">Hotspots</h3>
              <div className="space-y-2 max-h-44 overflow-auto">
                {hotspots.map((spot) => (
                  <div
                    key={spot.key}
                    className="rounded-lg border border-outline-variant/10 p-2 text-sm"
                  >
                    <p className="font-semibold">
                      {spot.count} issues near {spot.key}
                    </p>
                  </div>
                ))}
                {!hotspots.length && (
                  <p className="text-sm text-outline">
                    No hotspot clusters found.
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
