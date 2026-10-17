import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="page">
      <div className="view-head"><h1>Page not found</h1><p>That page does not exist. It may have moved.</p></div>
      <div className="row"><Link className="btn" to="/">Go home</Link><Link className="btn ghost" to="/today">Open today's timetable</Link></div>
    </div>
  );
}
