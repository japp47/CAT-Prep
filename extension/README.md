# The 99ile Chrome extension (F53, D110)

Opens 99ile in Chrome's side panel beside any article and makes a CAT-style RC set from it. The panel is the site
itself (`/panel/*` in a frame), so sign-in, the store, sync and the RC player are the site's own. Design and reasons:
`docs/design/article-to-rc.md`, "Shape" and "The extension".

| File | What it does |
|---|---|
| `src/background.ts` | The icon, the right-click entries and Alt+Shift+R; opens the panel, then reads the tab; the welcome tab at install |
| `src/reader.ts` | Runs in the tab after a click: the selection, else Readability's article; a word's sentence; marks deciding lines |
| `src/panel.ts`, `static/panel.html` | The side panel: frames the site's `/panel` and relays messages, to 99ile's origin only |
| `src/select.ts` | The "Add to RC set" button beside a selection; on every site once switched on, else after the extension was used on the page |
| `src/text.ts` | Pure helpers, tested in `text.test.ts` |
| `key.txt` | The public key that pins the id `jdbigbpnbadjaphglkhomapjbhajbphe` (no private key is needed or kept) |

## Build

```
npm run ext:build      # for https://99ile.in, into extension/dist
npm run ext:dev        # for the local site, http://localhost:5173
npm run ext:typecheck
```

## Try it

1. `chrome://extensions`, turn on Developer mode, **Load unpacked**, pick `extension/dist`. Pin the 99ile icon
   (the puzzle-piece menu). A welcome tab opens: sign in there.
2. Open an essay (Aeon, The Hindu's editorial page) and click the icon, or select a few paragraphs and right-click
   "Make an RC set from this", or press Alt+Shift+R (change it at `chrome://extensions/shortcuts`).
3. "Make my set", answer, then in review "Show me in the article".
4. Right-click a word, "Add to my words".
5. On `chrome://extensions` or a PDF, the panel offers paste instead.

After any change to `extension/`, run the build again and press the reload arrow on the extension's card. Changes
to the site need no extension reload: the panel shows whatever the site serves.

## Publishing to the Chrome Web Store

Everything to paste and upload is in `listing/` (`listing.md`, five screenshots, the promo tile, the icon).

1. Developer Dashboard, Account: confirm the contact email. (Non-trader: chosen.)
2. `npm run ext:store`, then **Add new item** and upload `extension/99ile-chrome-<version>.zip`. Do not submit yet.
3. From the item's **Package** tab, copy the **item id** and the **public key**.
4. Switch to the store's id: the public key into `key.txt`; the id into `EXTENSION_IDS` (`src/lib/panel.ts`) and the
   two `/panel` rules in `public/_headers`; `STORE_URL` in `src/pages/Extension.tsx`; `/chrome` in
   `public/_redirects` to the listing. Deploy, check `curl -sI https://99ile.in/panel | grep -i content-security`,
   then `npm run ext:build` and reload the unpacked copy (it now has the store's id).
5. **Store listing**, **Privacy** and **Distribution** tabs: paste from `listing/listing.md`, upload the images.
6. Rebuild with `npm run ext:store`, upload it on the Package tab, and **Submit for review**.
