export function initials(name: string) { return name.replace(/\(.*?\)/g, "").trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase(); }
export function commentTitle(body: string) { return body.length > 85 ? body.slice(0, 82).trim() + "…" : body; }
