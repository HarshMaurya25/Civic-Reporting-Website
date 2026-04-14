import { get, post, put, del } from "../lib/http";

function toStageLabel(stage) {
  return (stage || "").replaceAll("_", " ");
}

function makeQuery(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });
  return query.toString();
}

export async function login({ email, password, role }) {
  const normalizedRole =
    role === "supervisor"
      ? "SUPERVISOR"
      : role === "worker"
        ? "WORKER"
        : "ADMIN";
  const endpoint =
    normalizedRole === "SUPERVISOR"
      ? "/api/supervisior/login"
      : normalizedRole === "WORKER"
        ? "/api/worker/login"
        : "/api/authenication/login";
  const payload = await post(endpoint, { email, password });

  const sessionUser = {
    id: payload?.id,
    email: payload?.email || email,
    fullName: payload?.fullName || "NagarSetu User",
    role: normalizedRole,
  };

  return {
    token: payload?.token,
    user: sessionUser,
  };
}

export function registerSupervisor(payload) {
  return post("/api/supervisior/registration", payload);
}

export async function sendSupervisorRegistrationCode(email) {
  const query = makeQuery({ email, roles: "SUPERVISOR" });
  return get(`/api/supervisior/getCode?${query}`);
}

export function getUserProfile(userId) {
  return get(`/api/user/get?id=${userId}`);
}

export function getUserMatrix(userId) {
  return get(`/api/user/getMatrix?id=${userId}`);
}

export function getUserLeaderboard() {
  return get("/api/user/getLeaderboard");
}

export function getAdminStatsOverview() {
  return get("/api/admin/stats/overview");
}

export function getSolvedIssues(page = 0, size = 3) {
  return get(`/api/issue/solved?page=${page}&size=${size}`);
}

export async function getPublicLandingData(userId) {
  const requests = [
    getUserLeaderboard(),
    getAdminIssueMatrix().catch(() => null),
    getAdminStatsOverview().catch(() => null),
    getSolvedIssues(0, 3).catch(() => null),
  ];
  requests.push(
    userId ? getUserMatrix(userId).catch(() => null) : Promise.resolve(null),
  );

  const [leaderboard, adminMatrix, overview, solvedIssues, userMatrix] =
    await Promise.all(requests);
  return {
    leaderboard: leaderboard || [],
    adminMatrix,
    overview,
    solvedIssues: solvedIssues?.content || [],
    userMatrix,
  };
}

export async function getAdminDashboard() {
  const [issueMatrix, workers, supervisors, recent, weeklyStages, leaderboard] =
    await Promise.all([
      getAdminIssueMatrix(),
      get("/api/admin/workers"),
      get("/api/admin/supervisors"),
      get("/api/issue/recent?page=0&size=6"),
      get("/api/issue/stats/weekly/stages"),
      getUserLeaderboard().catch(() => []),
    ]);

  return {
    issueMatrix,
    workers,
    supervisors,
    recent: recent?.content || [],
    weeklyStages: weeklyStages || [],
    leaderboard,
  };
}

export function getAdminIssueMatrix(wardId) {
  const query = makeQuery({ wardId });
  return get(`/api/admin/issues/stats/matrix${query ? `?${query}` : ""}`);
}

export function getAdminCitizenDetail(userId) {
  return get(`/api/admin/users/citizens/${userId}/detail`);
}

export function getAdminWorkerDetail(workerId) {
  return get(`/api/admin/users/workers/${workerId}/detail`);
}

export function getAdminSupervisorDetail(supervisorId) {
  return get(`/api/admin/users/supervisors/${supervisorId}/detail`);
}

export function getIssueDetail(issueId) {
  return get(`/api/issue/${issueId}`);
}

export function getAdminMapIssues() {
  return get("/api/issue/map/admin");
}

export function getWardDetail(wardId, wardName) {
  const query = makeQuery({ wardId, wardName });
  return get(`/api/admin/wards/detail${query ? `?${query}` : ""}`);
}

export function uploadWardGeoJson(payload) {
  return post("/api/wards/upload", payload);
}

export async function getAdminAnalytics() {
  const [thirtyDays, weeklyStages, leaderboard] = await Promise.all([
    get("/api/admin/issues/stats/30days"),
    get("/api/issue/stats/weekly/stages"),
    get("/api/user/getLeaderboard"),
  ]);

  return {
    thirtyDays,
    weeklyStages,
    leaderboard,
  };
}

export async function getAdminIssueList(page = 0, size = 10) {
  const recent = await get(`/api/issue/recent?page=${page}&size=${size}`);
  const base = recent?.content || [];

  const details = await Promise.all(
    base.map(async (item) => {
      try {
        const [full, worker] = await Promise.all([
          get(`/api/issue/${item.id}`),
          get(`/api/issue/${item.id}/worker`).catch(() => null),
        ]);

        return {
          id: item.id,
          title: full?.title || item.title,
          issueType: full?.issueType || "OTHER",
          location: full?.location || "N/A",
          criticality: full?.criticality || "LOW",
          stage: full?.stages || item.stages,
          submittedAt: full?.createAt || item.createdAt,
          image: full?.imageUrl || item.imageUrl || null,
          assignedTo: worker?.workerName || "Unassigned",
        };
      } catch {
        return {
          id: item.id,
          title: item.title,
          issueType: "OTHER",
          location: "N/A",
          criticality: "LOW",
          stage: item.stages,
          submittedAt: item.createdAt,
          image: item.imageUrl,
          assignedTo: "Unassigned",
        };
      }
    }),
  );

  return {
    totalElements: recent?.totalElements || details.length,
    totalPages: recent?.totalPages || 1,
    pageNumber: recent?.number || 0,
    content: details.map((it) => ({
      ...it,
      stageLabel: toStageLabel(it.stage),
    })),
  };
}

export async function getAdminWorkforce() {
  const [supervisors, workers, workersNoStart, supervisorsNoStart] =
    await Promise.all([
      get("/api/admin/supervisors"),
      get("/api/admin/workers"),
      get("/api/admin/workers/no-start"),
      get("/api/admin/supervisors/no-start"),
    ]);

  return {
    supervisors,
    workers,
    workersNoStart,
    supervisorsNoStart,
  };
}

export async function getAdminWards() {
  const [wards, geojson] = await Promise.all([
    get("/api/admin/wards"),
    get("/api/wards/geojson").catch(() => ({})),
  ]);

  return {
    wards,
    geojson,
  };
}

export async function allocateWardToSupervisor(wardId, supervisorId) {
  return put(`/api/admin/wards/${wardId}/supervisor/${supervisorId}`, {});
}

export async function reassignWorker(workerId, supervisorId) {
  return put(`/api/admin/reassignWorker/${workerId}/${supervisorId}`, {});
}

export async function reassignIssueWorker(issueId, workerId) {
  return put(`/api/admin/reassignIssueWorker/${issueId}/${workerId}`, {});
}
export function getTopWards() {
  return get("/public/api/performance/top-wards");
}
export function deleteWard(wardName) {
  return del(`/api/wards/name/${encodeURIComponent(wardName)}`);
}
export async function deleteSupervisor(supervisorId) {
  return del(`/api/admin/supervisors/${supervisorId}`);
}

export async function getSupervisorDashboard(supervisorId) {
  const [matrix, workers, recent] = await Promise.all([
    get(`/api/supervisior/issues/stats/matrix?supervisorId=${supervisorId}`),
    get(`/api/supervisior/${supervisorId}/workers`),
    get("/api/issue/recent?page=0&size=8"),
  ]);

  const mapIssues = matrix?.wardId
    ? await getSupervisorMapIssues(matrix.wardId).catch(() => [])
    : [];

  return {
    matrix,
    workers,
    mapIssues,
    recent: recent?.content || [],
  };
}

export function getSupervisorIssueMatrix(supervisorId, wardId) {
  const query = makeQuery({ supervisorId, wardId });
  return get(`/api/supervisior/issues/stats/matrix?${query}`);
}

export function getSupervisorMapIssues(wardId) {
  return get(`/api/issue/map/supervisor?wardId=${wardId}`);
}

export function getWorkerAssignedIssues(workerId) {
  return get(`/api/worker/issues/assigned?workerId=${workerId}`);
}

export async function getSupervisorMap(supervisorId) {
  const [matrix, workers] = await Promise.all([
    getSupervisorIssueMatrix(supervisorId),
    get(`/api/supervisior/${supervisorId}/workers`),
  ]);

  const issues = matrix?.wardId
    ? await getSupervisorMapIssues(matrix.wardId).catch(() => [])
    : [];

  return { workers, issues, matrix };
}
