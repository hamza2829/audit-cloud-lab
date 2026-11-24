import type { AuthService, Repo } from './repo';

let repo: Repo | null = null;
let authService: AuthService | null = null;

export function configureServices(r: Repo, a: AuthService) {
  repo = r;
  authService = a;
}

export function getRepo(): Repo {
  if (!repo) throw new Error('Repo not configured');
  return repo;
}

export function getAuthService(): AuthService {
  if (!authService) throw new Error('Auth service not configured');
  return authService;
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
