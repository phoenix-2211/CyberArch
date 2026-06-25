const BASE = "http://127.0.0.1:5000";

const getHeaders = (): HeadersInit => ({
  "Content-Type": "application/json",
  "Authorization": `Bearer ${localStorage.getItem("token")}`,
});

const handleResponse = async (res: Response) => {
  if (res.status === 401) {
    localStorage.clear();
    window.location.href = "/login";
    return;
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.error || "Request failed");
  return data;
};

export const api = {
  login: (username: string, password: string) =>
    fetch(`${BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    }).then(handleResponse),

  createUser: (username: string, password: string, role: string) =>
    fetch(`${BASE}/admin/create-user`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ username, password, role }),
    }).then(handleResponse),

  getDashboardStats: () =>
    fetch(`${BASE}/dashboard-stats`, { headers: getHeaders() }).then(handleResponse),

  deleteUser: (userId: string) =>
    fetch(`${BASE}/users/${userId}/delete`, {
      method: "DELETE",
      headers: getHeaders(),
    }).then(handleResponse),

  getDevices: (page = 1, perPage = 50) =>
    fetch(`${BASE}/list-devices?page=${page}&per_page=${perPage}`, { headers: getHeaders() }).then(handleResponse),

  registerDevice: (device_id: string, secret_key: string) =>
    fetch(`${BASE}/register-device`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ device_id, secret_key }),
    }).then(handleResponse),

  unlockDevice: (deviceId: string) =>
    fetch(`${BASE}/device/${deviceId}/unlock`, { method: "POST", headers: getHeaders() }).then(handleResponse),

  getSecurityEvents: (page = 1, perPage = 50, severity = "", eventType = "") =>
    fetch(
      `${BASE}/security-events?page=${page}&per_page=${perPage}${severity ? "&severity=" + severity : ""}${eventType ? "&event_type=" + eventType : ""}`,
      { headers: getHeaders() }
    ).then(handleResponse),

  getAlerts: (page = 1, perPage = 50) =>
    fetch(`${BASE}/alerts?page=${page}&per_page=${perPage}`, { headers: getHeaders() }).then(handleResponse),

  runDetections: () =>
    fetch(`${BASE}/run-detections`, { method: "POST", headers: getHeaders() }).then(handleResponse),

  runSoar: () =>
    fetch(`${BASE}/run-soar`, { method: "POST", headers: getHeaders() }).then(handleResponse),

  getBlockchain: () =>
    fetch(`${BASE}/blockchain`, { headers: getHeaders() }).then(handleResponse),

  getUsers: () =>
    fetch(`${BASE}/users`, { headers: getHeaders() }).then(handleResponse),

  disableUser: (userId: string) =>
    fetch(`${BASE}/users/${userId}/disable`, { method: "POST", headers: getHeaders() }).then(handleResponse),

  getBlockedIPs: () =>
    fetch(`${BASE}/blocked-ips`, { headers: getHeaders() }).then(handleResponse),

  unblockIP: (ipId: string) =>
    fetch(`${BASE}/blocked-ips/${ipId}/unblock`, { method: "DELETE", headers: getHeaders() }).then(handleResponse),

  getDashboardCharts: () =>
    fetch(`${BASE}/dashboard-charts`, { headers: getHeaders() }).then(handleResponse),

  revokeDevice: (deviceId: string) =>
    fetch(`${BASE}/device/${deviceId}/revoke`, {
      method: "POST",
      headers: getHeaders(),
    }).then(handleResponse),

  grantDevice: (deviceId: string) =>
    fetch(`${BASE}/device/${deviceId}/grant`, {
      method: "POST",
      headers: getHeaders(),
    }).then(handleResponse),

  resetUserPassword: (userId: string, newPassword: string) =>
    fetch(`${BASE}/users/${userId}/reset-password`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ new_password: newPassword }),
    }).then(handleResponse),

  exportSecurityEvents: (severity = "", eventType = "") => {
    const token = localStorage.getItem("token");
    const params = new URLSearchParams();
    if (severity) params.append("severity", severity);
    if (eventType) params.append("event_type", eventType);

    return fetch(`${BASE}/security-events/export?${params.toString()}`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    }).then(async (res) => {
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `security_events_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    });
  },

  // ─── AI Analysis ────────────────────────────────────────────────────────────

  generateRiskSummary: (filters: Record<string, unknown> = {}) =>
    fetch(`${BASE}/ai/generate-risk-summary`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(filters),
    }).then(handleResponse),

  generateFullSocReport: (filters: Record<string, unknown> = {}) =>
    fetch(`${BASE}/ai/generate-full-soc-report`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(filters),
    }).then(handleResponse),

  generateAlertAnalysis: (filters: Record<string, unknown> = {}) =>
    fetch(`${BASE}/ai/generate-alert-analysis`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(filters),
    }).then(handleResponse),

  downloadReport: (filename: string) => {
    const token = localStorage.getItem("token");
    return fetch(`${BASE}/ai/download-report/${filename}`, {
      headers: { "Authorization": `Bearer ${token}` },
    }).then(async (res) => {
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    });
  },

  downloadDocx: (filename: string) => {
    const token = localStorage.getItem("token");
    return fetch(`${BASE}/ai/download-docx/${filename}`, {
      headers: { "Authorization": `Bearer ${token}` },
    }).then(async (res) => {
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    });
  },

  changePassword: (currentPassword: string, newPassword: string) =>
    fetch(`${BASE}/user/change-password`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    }).then(handleResponse),

  resetDatabase: () =>
    fetch(`${BASE}/admin/reset-database`, {
      method: "POST",
      headers: getHeaders(),
    }).then(handleResponse),

  backupDatabase: () => {
    const token = localStorage.getItem("token");
    return fetch(`${BASE}/admin/backup-database`, {
      headers: { "Authorization": `Bearer ${token}` },
    }).then(async (res) => {
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Backup failed");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "secure_iot_backup.db";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    });
  },

  getSystemConfig: () =>
    fetch(`${BASE}/system/config`, { headers: getHeaders() }).then(handleResponse),

  getSettingsConfig: () =>
    fetch(`${BASE}/admin/settings/config`, { headers: getHeaders() }).then(handleResponse),

  saveSettingsConfig: (settings: Record<string, any>) =>
    fetch(`${BASE}/admin/settings/config`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(settings),
    }).then(handleResponse),

  pullOllamaModel: (modelName: string) =>
    fetch(`${BASE}/admin/ollama/pull`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ model_name: modelName }),
    }).then(handleResponse),
};