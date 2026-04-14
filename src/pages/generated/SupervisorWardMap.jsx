import React, { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getIssueDetail, getSupervisorMap } from "../../services/api";
import { getUser } from "../../lib/session";

function markerColor(criticality) {
  if (criticality === "HIGH") return "#dc2626";
  if (criticality === "MEDIUM") return "#f59e0b";
  return "#22c55e";
}

function hotspotKey(issue) {
  return `${Number(issue.latitude).toFixed(2)}:${Number(issue.longitude).toFixed(2)}`;
}

export default function SupervisorWardMap() {
  const user = getUser();
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const mapNodeRef = useRef(null);

  const [issues, setIssues] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [matrix, setMatrix] = useState(null);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [selectedIssueDetail, setSelectedIssueDetail] = useState(null);

  const [criticalityFilter, setCriticalityFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [stageFilter, setStageFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("criticality");
  const [hotspotOnly, setHotspotOnly] = useState(false);

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
        const response = await getSupervisorMap(user.id);
        if (mounted) {
          setIssues(response?.issues || []);
          setWorkers(response?.workers || []);
          setMatrix(response?.matrix || null);
        }
      } catch (err) {
        if (mounted) {
          setError(err.message || "Failed to load supervisor map.");
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

  const hotspotCountMap = useMemo(() => {
    return issues.reduce((acc, issue) => {
      const key = hotspotKey(issue);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }, [issues]);

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
        if (sortBy === "issueType")
          return (a.issueType || "").localeCompare(b.issueType || "");
        if (sortBy === "hotspot")
          return (
            (hotspotCountMap[hotspotKey(b)] || 0) -
            (hotspotCountMap[hotspotKey(a)] || 0)
          );
        const level = { HIGH: 3, MEDIUM: 2, LOW: 1 };
        return (level[b.criticality] || 0) - (level[a.criticality] || 0);
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

  const hotspots = useMemo(() => {
    return Object.entries(hotspotCountMap)
      .filter(([, count]) => count >= 2)
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count);
  }, [hotspotCountMap]);

  useEffect(() => {
    if (!mapNodeRef.current || mapRef.current) return;

    mapRef.current = L.map(mapNodeRef.current).setView([28.6139, 77.209], 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(mapRef.current);

    setTimeout(() => mapRef.current?.invalidateSize(), 0);
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    if (layerRef.current) {
      layerRef.current.remove();
    }

    layerRef.current = L.layerGroup();

    filteredIssues.forEach((issue) => {
      const marker = L.circleMarker([issue.latitude, issue.longitude], {
        radius: 8,
        color: markerColor(issue.criticality),
        fillColor: markerColor(issue.criticality),
        fillOpacity: 0.8,
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

      layerRef.current.addLayer(marker);
    });

    layerRef.current.addTo(mapRef.current);

    if (filteredIssues.length) {
      const bounds = L.latLngBounds(
        filteredIssues.map((issue) => [issue.latitude, issue.longitude]),
      );
      mapRef.current.fitBounds(bounds.pad(0.2));
    }
  }, [filteredIssues]);

  return (
    <div className="pt-24 px-8 pb-12 space-y-6">
      <h1 className="text-3xl font-black text-primary">
        Supervisor Ward Map + Hotspots
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
              <p className="text-xs uppercase font-bold text-outline">Ward</p>
              <p className="text-2xl font-black">{matrix?.wardId || "N/A"}</p>
            </div>
            <div className="bg-surface-container-lowest p-5 rounded-xl border-l-4 border-secondary">
              <p className="text-xs uppercase font-bold text-outline">
                Visible Issues
              </p>
              <p className="text-2xl font-black">{filteredIssues.length}</p>
            </div>
            <div className="bg-surface-container-lowest p-5 rounded-xl border-l-4 border-tertiary">
              <p className="text-xs uppercase font-bold text-outline">
                Workers
              </p>
              <p className="text-2xl font-black">{workers.length}</p>
            </div>
            <div className="bg-surface-container-lowest p-5 rounded-xl border-l-4 border-error">
              <p className="text-xs uppercase font-bold text-outline">
                Hotspots
              </p>
              <p className="text-2xl font-black">{hotspots.length}</p>
            </div>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <article className="lg:col-span-2 bg-surface-container-lowest rounded-xl p-3">
              <div ref={mapNodeRef} className="h-[500px] rounded-lg" />
            </article>
            <article className="bg-surface-container-lowest rounded-xl p-4 space-y-3">
              <h2 className="font-bold">Issue Detail</h2>
              {!selectedIssue && (
                <p className="text-sm text-outline">
                  Click any marker to view complete issue detail.
                </p>
              )}
              {selectedIssue && (
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="font-semibold">ID:</span>{" "}
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

              <h3 className="font-bold pt-2">Hotspot Clusters</h3>
              <div className="space-y-2 max-h-44 overflow-auto">
                {hotspots.map((spot) => (
                  <div
                    key={spot.key}
                    className="rounded-lg border border-outline-variant/10 p-2 text-sm"
                  >
                    <p className="font-semibold">
                      {spot.count} issues around {spot.key}
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
