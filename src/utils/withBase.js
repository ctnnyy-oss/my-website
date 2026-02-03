export function withBase(path) {
  const base = import.meta.env.BASE_URL || "/";
  const clean = path.startsWith("/") ? path.slice(1) : path;
  return base.endsWith("/") ? `${base}${clean}` : `${base}/${clean}`;
}
