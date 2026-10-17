import { Link as RouterLink } from "react-router-dom";
import type { Link } from "../sections/types";

export function Ext({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return <a className={className} href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
}

/** A row of buttons for [label, href] pairs. Internal paths stay in the app. */
export function LinkButtons({ links }: { links: Link[] }) {
  if (!links.length) return null;
  return (
    <div className="blk-links">
      {links.map(([label, href]) =>
        href.startsWith("/")
          ? <RouterLink key={label} className="go" to={href}>{label}</RouterLink>
          : <Ext key={label} className="go" href={href}>{label} ↗</Ext>)}
    </div>
  );
}
