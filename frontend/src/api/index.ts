import type { Artwork, User, Report } from '../types';

const BASE = '/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export function getAuthHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export function fetchPublicArtworks(): Promise<{ artworks: Artwork[] }> {
  return fetchJson(`${BASE}/public/artworks`);
}

export function login(email: string, password: string): Promise<{ token: string; user: User }> {
  return fetchJson(`${BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
}

export function registerCollector(data: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  address?: string;
}): Promise<{ token: string; user: User }> {
  return fetchJson(`${BASE}/register/collector`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export function fetchArtworks(token: string): Promise<Artwork[]> {
  return fetchJson(`${BASE}/artworks`, { headers: getAuthHeaders(token) });
}

export function fetchMyArtworks(token: string): Promise<Artwork[]> {
  return fetchJson(`${BASE}/my/artworks`, { headers: getAuthHeaders(token) });
}

export function updateArtwork(token: string, id: string, body: any): Promise<any> {
  return fetchJson(`${BASE}/artworks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
    body: JSON.stringify(body),
  });
}

export function deleteArtwork(token: string, id: string): Promise<void> {
  return fetchJson(`${BASE}/artworks/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(token),
  });
}

export function uploadImage(token: string, file: File): Promise<{ imageUrl: string }> {
  const formData = new FormData();
  formData.append('image', file);
  return fetchJson(`${BASE}/upload`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: formData,
  });
}

export function fetchMyAchievements(token: string): Promise<any[]> {
  return fetchJson(`${BASE}/achievements`, { headers: getAuthHeaders(token) });
}

export function createAchievement(token: string, body: any): Promise<any> {
  return fetchJson(`${BASE}/achievements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
    body: JSON.stringify(body),
  });
}

export function deleteAchievement(token: string, id: string): Promise<void> {
  return fetchJson(`${BASE}/achievements/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(token),
  });
}

export function updateExhibitor(token: string, id: string, body: any): Promise<any> {
  return fetchJson(`${BASE}/exhibitors/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
    body: JSON.stringify(body),
  });
}

export function fetchMySoldArtworks(token: string): Promise<any[]> {
  return fetchJson(`${BASE}/my/sold-artworks`, { headers: getAuthHeaders(token) });
}

export function updateCollector(token: string, id: string, body: any): Promise<any> {
  return fetchJson(`${BASE}/collectors/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
    body: JSON.stringify(body),
  });
}

export function upgradeToExhibitor(token: string, body: { phone?: string; address?: string }): Promise<{ user: User }> {
  return fetchJson(`${BASE}/my/upgrade-to-exhibitor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
    body: JSON.stringify(body),
  });
}

// --- Admin ---

export interface AdminStats {
  users: { total: number; exhibitors: number; collectors: number };
  artworks: { total: number; byStatus: { status: string; _count: number }[]; byType: { type: string; _count: number }[] };
  sales: { totalValue: number; byMonth: { month: string; sales: number; count: number }[] };
  usersByMonth: { month: string; exhibitors: number; collectors: number }[];
}

export function fetchAdminStats(token: string): Promise<AdminStats> {
  return fetchJson(`${BASE}/admin/stats`, { headers: getAuthHeaders(token) });
}

export function fetchPendingAchievements(token: string): Promise<any[]> {
  return fetchJson(`${BASE}/admin/achievements/pending`, { headers: getAuthHeaders(token) });
}

export function verifyAchievement(token: string, id: string): Promise<any> {
  return fetchJson(`${BASE}/admin/achievements/${id}/verify`, {
    method: 'PUT',
    headers: getAuthHeaders(token),
  });
}

export function fetchAdminUsers(token: string): Promise<any> {
  return fetchJson(`${BASE}/admin/users`, { headers: getAuthHeaders(token) });
}

export function fetchPendingExhibitorRequests(token: string): Promise<any[]> {
  return fetchJson(`${BASE}/admin/exhibitors/pending`, { headers: getAuthHeaders(token) });
}

export function approveExhibitorRequest(token: string, id: string): Promise<any> {
  return fetchJson(`${BASE}/admin/exhibitors/approve/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(token),
  });
}

export function rejectExhibitorRequest(token: string, id: string): Promise<any> {
  return fetchJson(`${BASE}/admin/exhibitors/reject/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(token),
  });
}

export function fetchAdminSettings(token: string): Promise<{ paymentEnabled: boolean; achievementsEnabled: boolean; collectorRegistrationEnabled: boolean }> {
  return fetchJson(`${BASE}/admin/settings`, { headers: getAuthHeaders(token) });
}

export function updateAdminSettings(token: string, settings: Record<string, boolean>): Promise<{ paymentEnabled: boolean; achievementsEnabled: boolean; collectorRegistrationEnabled: boolean }> {
  return fetchJson(`${BASE}/admin/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
    body: JSON.stringify(settings),
  });
}

export function fetchAdminReports(token: string): Promise<Report[]> {
  return fetchJson(`${BASE}/admin/reports`, { headers: getAuthHeaders(token) });
}

export function resolveReport(token: string, id: string): Promise<Report> {
  return fetchJson(`${BASE}/admin/reports/${id}/resolve`, {
    method: 'PUT',
    headers: getAuthHeaders(token),
  });
}

// --- Exhibitor Stats ---

export interface ExhibitorStats {
  total: number;
  byStatus: { status: string; _count: number }[];
  byType: { type: string; _count: number }[];
  artworksByMonth: { month: string; count: number }[];
  sales: {
    total: number;
    averagePrice: number;
    count: number;
    byMonth: { month: string; sales: number; count: number }[];
    recent: { salePrice: number; saleDate: string; artworkTitle: string }[];
  };
  achievements: number;
}

export function fetchExhibitorStats(token: string): Promise<ExhibitorStats> {
  return fetchJson(`${BASE}/my/stats`, { headers: getAuthHeaders(token) });
}

// --- Messages ---

export function sendMessage(
  token: string,
  body: { exhibitorId: string; content: string; artworkId?: string; artworkType?: string }
): Promise<any> {
  return fetchJson(`${BASE}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
    body: JSON.stringify(body),
  });
}

export function replyMessage(
  token: string,
  body: { collectorId: string; content: string }
): Promise<any> {
  return fetchJson(`${BASE}/messages/reply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
    body: JSON.stringify(body),
  });
}

export function fetchConversation(token: string, exhibitorId: string): Promise<any[]> {
  return fetchJson(`${BASE}/messages/conversation/${exhibitorId}`, {
    headers: getAuthHeaders(token),
  });
}

export function fetchInbox(token: string): Promise<any[]> {
  return fetchJson(`${BASE}/messages/inbox`, { headers: getAuthHeaders(token) });
}

export function fetchMyConversations(token: string): Promise<any[]> {
  return fetchJson(`${BASE}/messages/my-conversations`, { headers: getAuthHeaders(token) });
}

export function fetchExhibitors(token: string): Promise<{ id: string; name: string; profilePicture?: string | null }[]> {
  return fetchJson(`${BASE}/exhibitors`, { headers: getAuthHeaders(token) });
}

export function fetchExhibitorProfile(exhibitorId: string): Promise<any> {
  return fetchJson(`${BASE}/exhibitors/${exhibitorId}/profile`);
}

// --- Notifications ---

export function createNotification(token: string, body: { title: string; message: string; target: string }): Promise<any> {
  return fetchJson(`${BASE}/admin/notifications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
    body: JSON.stringify(body),
  });
}

export function fetchNotifications(token: string, role: string): Promise<any[]> {
  return fetchJson(`${BASE}/notifications/${role}`, { headers: getAuthHeaders(token) });
}

// --- AI Curator ---

export function chatWithCurator(token: string, message: string, history?: { role: string; text: string }[]): Promise<{ reply: string }> {
  return fetchJson(`${BASE}/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
    body: JSON.stringify({ message, history }),
  });
}

export function updateTheme(token: string, theme: string): Promise<{ message: string }> {
  return fetchJson(`${BASE}/auth/theme`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
    body: JSON.stringify({ theme }),
  });
}

export function forgotPassword(email: string): Promise<{ message: string }> {
  return fetchJson(`${BASE}/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
}

export function changePassword(token: string, oldPassword: string, newPassword: string): Promise<{ message: string }> {
  return fetchJson(`${BASE}/auth/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
    body: JSON.stringify({ oldPassword, newPassword }),
  });
}

export function changeEmail(token: string, newEmail: string): Promise<{ message: string }> {
  return fetchJson(`${BASE}/auth/change-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
    body: JSON.stringify({ newEmail }),
  });
}

// --- Payments ---

export function createArtworkListingCheckout(token: string): Promise<{ checkoutUrl: string | null; paymentId: string; message?: string }> {
  return fetchJson(`${BASE}/payments/artwork-listing`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
  });
}

export function confirmAndCreateArtwork(token: string, paymentId: string, artworkData: any): Promise<{ artwork: any; message: string }> {
  return fetchJson(`${BASE}/payments/confirm-and-create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
    body: JSON.stringify({ paymentId, artworkData }),
  });
}

export function submitReport(token: string, subject: string, message: string): Promise<{ id: string }> {
  return fetchJson(`${BASE}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
    body: JSON.stringify({ subject, message }),
  });
}
