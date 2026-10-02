// Shared Clerk browser loader for the static login / callback pages.
// Publishable key comes from the edge (`/auth/config`); it is not a secret.

function frontendApiFromKey(publishableKey) {
  const encoded = String(publishableKey).replace(/^pk_(test|live)_/, "");
  return atob(encoded).split("$")[0];
}

function loadScript(src, attrs = {}) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.crossOrigin = "anonymous";
    Object.entries(attrs).forEach(([k, v]) => s.setAttribute(k, v));
    s.onload = resolve;
    s.onerror = () => reject(new Error("Failed to load " + src));
    document.head.appendChild(s);
  });
}

export async function fetchPublishableKey() {
  const r = await fetch("/auth/config", { cache: "no-store" });
  if (!r.ok) throw new Error("Auth config unavailable");
  const { publishableKey } = await r.json();
  if (!publishableKey) throw new Error("CLERK_PUBLISHABLE_KEY is not set on Vercel");
  return publishableKey;
}

export async function loadClerk() {
  const pk = await fetchPublishableKey();
  const fapi = frontendApiFromKey(pk);
  if (!fapi) throw new Error("Could not derive Clerk Frontend API from publishable key");

  let uiCtor;
  try {
    await loadScript(`https://${fapi}/npm/@clerk/ui@1/dist/ui.browser.js`);
    uiCtor = window.__internal_ClerkUICtor;
  } catch {
    // clerk-js still mounts SignIn without the split UI bundle
  }

  await loadScript(`https://${fapi}/npm/@clerk/clerk-js@6/dist/clerk.browser.js`, {
    "data-clerk-publishable-key": pk,
  });

  const Clerk = window.Clerk;
  if (!Clerk) throw new Error("Clerk JS did not initialize");
  await Clerk.load(uiCtor ? { ui: { ClerkUI: uiCtor } } : {});
  return Clerk;
}

export const signInAppearance = {
  variables: {
    colorPrimary: "#004d43",
    colorBackground: "#ffffff",
    colorText: "#010101",
    borderRadius: "10px",
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
};
