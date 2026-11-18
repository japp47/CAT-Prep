import { Button } from "@/components/ui/button";
import { STORE_LIVE, STORE_URL } from "../data/site";
import { LinkButton } from "./kit";

/**
 * Get the Chrome extension (F53): straight to the Chrome Web Store once the listing is live, else to /extension, which
 * says what it does. One switch, STORE_LIVE in data/site.ts, changes every one at once.
 */
export default function GetExtension({ variant = "secondary", size = "default", className }: { variant?: "default" | "secondary"; size?: "default" | "lg"; className?: string }) {
  return STORE_LIVE
    ? <Button asChild variant={variant} size={size} className={className}><a href={STORE_URL} target="_blank" rel="noreferrer noopener">Add to Chrome, free</a></Button>
    : <LinkButton to="/extension" variant={variant} size={size} className={className}>See the extension</LinkButton>;
}
