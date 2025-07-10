// UUID validation utility
export function isValidUUID(uuid: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);
}

// API URL utility
export function getApiUrl(): string {
  return import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
}

// Local storage utilities
export function getMemberId(): string | null {
  const memberId = localStorage.getItem("member_id");
  return memberId && isValidUUID(memberId) ? memberId : null;
}

export function setMemberId(memberId: string): void {
  if (isValidUUID(memberId)) {
    localStorage.setItem("member_id", memberId);
  }
}

export function clearMemberData(): void {
  localStorage.removeItem("member_id");
  localStorage.removeItem("member_email");
} 