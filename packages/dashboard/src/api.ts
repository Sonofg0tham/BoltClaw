/**
 * Shared API helper that attaches the BoltClaw auth token to every request.
 *
 * The token is injected into the page by the Express server as
 * window.__BOLTCLAW_TOKEN__. If the token is missing, requests will
 * fail with 401 and the UI should show an error.
 */

declare global {
  interface Window {
    __BOLTCLAW_TOKEN__?: string;
  }
}

function getToken(): string | null {
  // Injected by server into the HTML page
  if (window.__BOLTCLAW_TOKEN__) return window.__BOLTCLAW_TOKEN__;

  // Fallback: check URL query parameter (for direct links)
  const params = new URLSearchParams(window.location.search);
  const urlToken = params.get("token");
  if (urlToken) {
    // Store it so we don't lose it on navigation
    window.__BOLTCLAW_TOKEN__ = urlToken;
    // Strip token from URL so it doesn't leak into browser history or referer
    const url = new URL(window.location.href);
    url.searchParams.delete("token");
    window.history.replaceState({}, "", url.toString());
    return urlToken;
  }

  return null;
}

/**
 * Drop-in replacement for fetch() that attaches the auth token.
 * Same signature as window.fetch.
 */
export async function apiFetch(
  input: string,
  init?: RequestInit,
): Promise<Response> {
  const token = getToken();
  const headers = new Headers(init?.headers);
  if (token) {
    headers.set("x-boltclaw-token", token);
  }
  return fetch(input, { ...init, headers });
}
