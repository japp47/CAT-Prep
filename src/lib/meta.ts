/** The page description, which the router resets on every move and a page may set for itself (a guide does). */
let site: string | null = null;

function tag(): HTMLMetaElement {
  let m = document.querySelector<HTMLMetaElement>('meta[name="description"]');
  if (!m) { m = document.createElement("meta"); m.name = "description"; document.head.appendChild(m); }
  return m;
}

/** With text, sets the description. Without, puts back the site's own (the one in index.html). */
export function setDescription(text?: string) {
  const m = tag();
  if (site === null) site = m.content;
  m.content = text ?? site;
}
