import { Link } from "react-router-dom";

export default function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5 rounded-md text-foreground" aria-label="99ile home">
      <img src={import.meta.env.BASE_URL + "favicon.svg"} alt="" className="size-9" width={36} height={36} />
      {!compact && <span className="text-[1.375rem] leading-none font-bold tracking-tight">99ile</span>}
    </Link>
  );
}
