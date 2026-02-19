interface User {
  id: string;
  username: string;
}

const USER_KEY = 'stripe_demo_user';

export function getUser(): User | null {
  const data = localStorage.getItem(USER_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function setUser(user: User): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearUser(): void {
  localStorage.removeItem(USER_KEY);
}

export function generateUsername(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'user_';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
