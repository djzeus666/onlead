/**
 * Hash router — online-lead.ru style SPA routing.
 */
window.OnLead = window.OnLead || {};

function hashRouteRaw() {
  let raw = location.hash.replace(/^#/, "") || "/";
  const q = raw.indexOf("?");
  if (q !== -1) raw = raw.slice(0, q);
  let pathPart = raw;
  const anchorIdx = pathPart.indexOf("#");
  if (anchorIdx !== -1) pathPart = pathPart.slice(0, anchorIdx);
  if (pathPart.length > 1 && pathPart.endsWith("/")) {
    pathPart = pathPart.replace(/\/+$/, "");
    raw = anchorIdx === -1 ? pathPart : pathPart + raw.slice(anchorIdx);
  }
  return raw;
}

function hashAnchor() {
  const raw = hashRouteRaw();
  const i = raw.indexOf("#");
  return i === -1 ? "" : raw.slice(i + 1);
}

function route() {
  let raw = hashRouteRaw();
  const anchorIdx = raw.indexOf("#");
  if (anchorIdx !== -1) raw = raw.slice(0, anchorIdx);
  if (raw.startsWith("/")) return { path: raw, section: null };
  return { path: "/", section: raw };
}

function landingInPageHref(page, anchor) {
  const raw = hashRouteRaw();
  let pathOnly = raw;
  const i = pathOnly.indexOf("#");
  if (i !== -1) pathOnly = pathOnly.slice(0, i);
  if (pathOnly.startsWith("/p/") || pathOnly.startsWith("/l/")) {
    return `#${pathOnly}#${anchor}`;
  }
  if (page?.id) return `#/p/${encodeURIComponent(page.id)}#${anchor}`;
  if (page?.slug) return `#/l/${encodeURIComponent(page.slug)}#${anchor}`;
  return `#${anchor}`;
}

function scrollToHashAnchor() {
  const anchor = hashAnchor();
  if (!anchor) return;
  requestAnimationFrame(() => {
    const el = document.getElementById(anchor);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function go(hash) {
  location.hash = hash.startsWith("#") ? hash : "#" + hash;
}

function hashParams() {
  const hash = location.hash.replace(/^#/, "");
  const i = hash.indexOf("?");
  const q = i === -1 ? String(location.search || "").replace(/^\?/, "") : hash.slice(i + 1);
  return new URLSearchParams(q);
}

OnLead.landingInPageHref = landingInPageHref;
OnLead.scrollToHashAnchor = scrollToHashAnchor;
OnLead.hashRouteRaw = hashRouteRaw;
OnLead.hashAnchor = hashAnchor;
OnLead.route = route;
OnLead.go = go;
OnLead.hashParams = hashParams;

// Legacy globals for feature modules loaded before app.js
window.hashParams = hashParams;
window.go = go;
window.route = route;
