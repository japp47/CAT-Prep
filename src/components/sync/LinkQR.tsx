import { encode } from "uqr";

/**
 * The link as a QR code, drawn as SVG (loaded only when "Link a device" is opened). Always dark on white, in both
 * themes: phone cameras read that best.
 */
export default function LinkQR({ url, label }: { url: string; label: string }) {
  const { data, size } = encode(url, { ecc: "M", border: 2 });
  let path = "";
  data.forEach((row, y) => row.forEach((on, x) => { if (on) path += `M${x} ${y}h1v1h-1z`; }));
  return (
    <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label} className="size-52 rounded-md bg-white p-1 sm:size-56" shapeRendering="crispEdges">
      <path d={path} fill="#000" />
    </svg>
  );
}
