import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getSupervisorIssues } from "../../services/api";
import { getUser } from "../../lib/session";

function formatDate(value) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString();
}

function markerColor(status) {
  if (status === "RESOLVED") return "#16a34a";
  if (status === "IN_PROGRESS") return "#f59e0b";
  return "#1d4ed8";
}

export default function SupervisorIssueManagement() {
  const user = getUser();
  const mapRef = useRef(null);
  const mapNodeRef = useRef(null);
  const markersLayerRef = useRef(null);
  const resizeObserverRef = useRef(null);

  const [baseIssues, setBaseIssues] = useState([]);
  const [wardOptions, setWardOptions] = useState([]);
  const [wardFilter, setWardFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadIssues = useCallback(async () => {
    if (!user?.id) {
      setError("Supervisor ID missing in session. Please login again.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await getSupervisorIssues({ supervisorId: user.id });
      const issues = response?.issues || [];
      setBaseIssues(issues);

      const optionsFromData = Array.from(
        new Map(
          issues
            .filter((item) => item.wardId || item.wardName)
            .map((item) => [
              String(item.wardId || item.wardName),
              {
                wardId: String(item.wardId || item.wardName),
                wardName: item.wardName || "Unknown Ward",
              },
            ]),
        ).values(),
      );
      setWardOptions(
        optionsFromData.length
          ? optionsFromData
          : (response?.wards || []).map((ward) => ({
              wardId: String(ward.wardId || ward.wardName),
              wardName: ward.wardName || "Assigned Ward",
            })),
      );
    } catch (err) {
      setError(err.message || "Failed to load supervisor issues.");
      setBaseIssues([]);
      setWardOptions([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadIssues();
  }, [loadIssues]);

  const filteredIssues = useMemo(() => {
    return baseIssues.filter((issue) => {
      const wardMatch =
        wardFilter === "ALL" ||
        String(issue.wardId || issue.wardName) === String(wardFilter);
      const statusMatch =
        statusFilter === "ALL" || String(issue.status) === String(statusFilter);
      return wardMatch && statusMatch;
    });
  }, [baseIssues, wardFilter, statusFilter]);

  useEffect(() => {
    if (!mapNodeRef.current || mapRef.current) return;

    mapRef.current = L.map(mapNodeRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView([28.6139, 77.209], 12);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(mapRef.current);

    markersLayerRef.current = L.layerGroup().addTo(mapRef.current);

    const invalidate = () => {
      requestAnimationFrame(() => {
        mapRef.current?.invalidateSize();
      });
    };
    setTimeout(invalidate, 80);
    setTimeout(invalidate, 300);

    if (typeof ResizeObserver !== "undefined") {
      resizeObserverRef.current = new ResizeObserver(() => invalidate());
      resizeObserverRef.current.observe(mapNodeRef.current);
    }

    return () => {
      resizeObserverRef.current?.disconnect();
      markersLayerRef.current?.remove();
      mapRef.current?.remove();
      markersLayerRef.current = null;
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    const validIssues = filteredIssues.filter(
      (issue) =>
        typeof issue.latitude === "number" &&
        Number.isFinite(issue.latitude) &&
        typeof issue.longitude === "number" &&
        Number.isFinite(issue.longitude),
    );

    validIssues.forEach((issue) => {
      const marker = L.circleMarker([issue.latitude, issue.longitude], {
        radius: 8,
        color: markerColor(issue.status),
        fillColor: markerColor(issue.status),
        fillOpacity: 0.82,
      });

      marker.bindPopup(
        `<strong>${issue.title}</strong><br/>${issue.wardName || "N/A"}<br/>${issue.status}`,
      );
      marker.on("click", () => {
        setSelectedIssue(issue);
      });
      markersLayerRef.current.addLayer(marker);
    });

    if (validIssues.length) {
      const bounds = L.latLngBounds(
        validIssues.map((issue) => [issue.latitude, issue.longitude]),
      );
      mapRef.current.fitBounds(bounds.pad(0.2));
    } else {
      mapRef.current.setView([28.6139, 77.209], 12);
    }

    mapRef.current.invalidateSize();
  }, [filteredIssues]);

  return (
    <div className="pt-24 px-8 pb-12 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-3xl font-black text-primary">
          Supervisor Issue Management
        </h1>
        <button
          type="button"
          className="px-4 py-2 rounded-xl bg-surface-container-low font-semibold"
          onClick={loadIssues}
        >
          Refresh
        </button>
      </div>

      {loading && <p>Loading issues...</p>}
      {error && <p className="text-error">{error}</p>}

      {!loading && !error && (
        <>
          <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-surface-container-lowest rounded-xl p-5 border-l-4 border-primary">
              <p className="text-xs uppercase font-bold text-outline">
                Total Issues
              </p>
              <p className="text-3xl font-black">{baseIssues.length}</p>
            </div>
            <div className="bg-surface-container-lowest rounded-xl p-5 border-l-4 border-secondary">
              <p className="text-xs uppercase font-bold text-outline">Open</p>
              <p className="text-3xl font-black">
                {baseIssues.filter((item) => item.status === "OPEN").length}
              </p>
            </div>
            <div className="bg-surface-container-lowest rounded-xl p-5 border-l-4 border-tertiary">
              <p className="text-xs uppercase font-bold text-outline">
                In Progress
              </p>
              <p className="text-3xl font-black">
                {
                  baseIssues.filter((item) => item.status === "IN_PROGRESS")
                    .length
                }
              </p>
            </div>
            <div className="bg-surface-container-lowest rounded-xl p-5 border-l-4 border-error">
              <p className="text-xs uppercase font-bold text-outline">
                Resolved
              </p>
              <p className="text-3xl font-black">
                {baseIssues.filter((item) => item.status === "RESOLVED").length}
              </p>
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select
              className="bg-surface-container-lowest px-3 py-2 rounded-lg"
              value={wardFilter}
              onChange={(e) => setWardFilter(e.target.value)}
            >
              <option value="ALL">All Wards</option>
              {wardOptions.map((ward) => (
                <option key={ward.wardId} value={ward.wardId}>
                  {ward.wardName}
                </option>
              ))}
            </select>

            <select
              className="bg-surface-container-lowest px-3 py-2 rounded-lg"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Status</option>
              <option value="OPEN">OPEN</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="RESOLVED">RESOLVED</option>
            </select>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <article className="lg:col-span-2 bg-surface-container-lowest rounded-xl p-3">
              <div ref={mapNodeRef} className="h-[500px] rounded-lg" />
            </article>

            <article className="bg-surface-container-lowest rounded-xl p-4 space-y-3">
              <h2 className="font-bold">Selected Issue</h2>
              {!selectedIssue && (
                <p className="text-sm text-outline">
                  Click a marker on map to inspect issue details.
                </p>
              )}
              {selectedIssue && (
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="font-semibold">Title:</span>{" "}
                    {selectedIssue.title}
                  </p>
                  <p>
                    <span className="font-semibold">Description:</span>{" "}
                    {selectedIssue.description || "N/A"}
                  </p>
                  <p>
                    <span className="font-semibold">Ward:</span>{" "}
                    {selectedIssue.wardName || "N/A"}
                  </p>
                  <p>
                    <span className="font-semibold">Status:</span>{" "}
                    {selectedIssue.status}
                  </p>
                  <p>
                    <span className="font-semibold">Created:</span>{" "}
                    {formatDate(selectedIssue.createdAt)}
                  </p>
                  <p>
                    <span className="font-semibold">Location:</span>{" "}
                    {selectedIssue.latitude}, {selectedIssue.longitude}
                  </p>
                </div>
              )}
            </article>
          </section>

          <section className="bg-surface-container-lowest rounded-xl overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-container-low">
                <tr>
                  <th className="text-left px-4 py-3">Title</th>
                  <th className="text-left px-4 py-3">Description</th>
                  <th className="text-left px-4 py-3">Ward</th>
                  <th className="text-left px-4 py-3">Location</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Created Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredIssues.map((issue) => (
                  <tr
                    key={issue.id}
                    className="border-b border-outline-variant/10 hover:bg-surface-container-low/60"
                    onClick={() => setSelectedIssue(issue)}
                  >
                    <td className="px-4 py-3 font-semibold">{issue.title}</td>
                    <td className="px-4 py-3 text-on-surface-variant max-w-xs truncate">
                      {issue.description || "N/A"}
                    </td>
                    <td className="px-4 py-3">{issue.wardName || "N/A"}</td>
                    <td className="px-4 py-3">
                      {issue.latitude}, {issue.longitude}
                    </td>
                    <td className="px-4 py-3">{issue.status}</td>
                    <td className="px-4 py-3">{formatDate(issue.createdAt)}</td>
                  </tr>
                ))}
                {!filteredIssues.length && (
                  <tr>
                    <td className="px-4 py-6 text-outline" colSpan={6}>
                      No issues found for selected filters.
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
