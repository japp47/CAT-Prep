# Replay clips (F101), 11 Nov 2026

Decision D94 in `docs/analyze.md`. Builds on DILR Replay (F57, `docs/design/replay.md`, D66).

## The problem

A Replay's deduction is the one thing 99ile shows that nothing else in Indian CAT prep does: the number of arrangements falling clue by clue, proved by a solver. It lives only on the site. The owner is starting on Instagram and needs material that is true by construction. A student who enjoyed a set has no way to send it to a friend except a link to a page.

## Research behind the shape (11 Nov 2026)

- **Strategy** (`reports/Standing out in AI learning.md`, direction 5): an output that entertains people who are not preparing for anything spreads by itself (NotebookLM's audio overviews). The shared thing should be about the work, not a rank. Students distrust AI-made questions; a clip whose every number is computed by a solver makes the opposite claim.
- **Instagram Reels**: 9:16, 1080 × 1920, MP4 with H.264, 30 fps; at least 3 seconds. The app's own controls cover roughly the bottom fifth and a strip on the right, so text stays inside a safe area ([Argil](https://argil.ai/blog/instagram-reel-size-e350f), [Wyzowl](https://wyzowl.com/social-media-video-specs/)). These are vendor summaries, not Meta's own page; they agree on the numbers used here.
- **Encoding in the browser**: WebCodecs `VideoEncoder` with H.264 is in Chrome and Edge, in Safari since the 26 releases and in Firefox desktop; feature detection with `VideoEncoder.isConfigSupported()` is the advice everywhere ([MDN, codec selection](https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API/Codec_selection)). It encodes frame by frame, faster than real time and exact. `MediaRecorder` on a canvas stream records in real time; Safari records MP4, Chrome MP4 from about version 130, Firefox WebM only ([Chromium intent to ship](https://groups.google.com/a/chromium.org/g/blink-dev/c/p1OMVj1FrMI)). WebCodecs gives encoded chunks, not a file: something must write the MP4 container. The usual library, `mp4-muxer`, is deprecated in favour of Mediabunny (about 17 KB gzipped for the MP4 writer) ([migration guide](https://vanilagy.github.io/mp4-muxer/MIGRATION-GUIDE.html)).

## Decisions (D94)

1. **Draw, do not screen-record.** Each frame is drawn on a 1080 × 1920 canvas from the same trail the Replay page uses (`trailOf`): the count, the staircase, the board. A screen recording would depend on the student's window, theme and font loading; a drawn frame is the same on every device and can be tested.
2. **H.264 MP4 through WebCodecs, with our own MP4 writer.** One video track, no sound, fixed frame rate: the container is a dozen boxes (`src/lib/mp4.ts`, about 150 lines, tested by reading the boxes back). No new dependency: the owner asks before any, `mp4-muxer` is deprecated and its successor is larger than what is needed.
3. **Fallbacks.** Without H.264 in WebCodecs, record the canvas in real time with `MediaRecorder` (MP4 where offered, else WebM, labelled as such). Always offered: **a picture** (PNG, 1080 × 1920) of the last frame, which works everywhere and suits a story or a post.
4. **Two endings.** *Leave the last step* (the default): the clip stops with a few arrangements left and asks the viewer to finish it on 99ile, so it spoils nothing and gives a reason to visit. *Show the answer*: every step to one arrangement, with the step that cut the most. The archery replay is an LR set; its clip defaults to leaving the last step like the rest.
5. **The link** printed on the last frame is the page's own address (`location.host` + `/practice/replay/<id>`), so it is right on the live site and on a preview.
6. **Nothing is saved or sent.** The clip is made and kept in the browser; no record, no server, no sync kind. Sharing uses the phone's share sheet (`navigator.share` with the file) where it can take files, otherwise a download.
7. **Bundle.** The clip code (drawing, encoder, MP4 writer, the panel) is one lazy chunk, loaded on the first tap of "Make a clip", like the year menu (D93). The first download does not grow.
8. **Theme.** Light or dark, from the site's tokens; the panel starts with the theme the student is using.

## The clip

```
 ┌──────────── 1080 × 1920 ────────────┐
 │ 99ile    DILR replay, scheduling    │  top bar
 │ Five talks in one week              │  title
 │                                     │
 │ Ways left                 from 120  │
 │ 6                                   │  the big number counts down
 │ Start  ████████████████████  120    │
 │ Step 1 ██████████             6     │  staircase, log scale, highlighter on the biggest cut
 │ Step 2 ███████                ?     │
 │                                     │
 │ Step 1 of 3: clues 4 and 2          │
 │ "Dev speaks the day after Bilal."   │  the step's clues, quoted
 │ Bilal and Dev sit side by side ...  │  the worked line (say)
 │                                     │
 │ ┌ Day   Mon Tue Wed Thu Fri ──────┐ │
 │ │ Asha   ✓   ✕   ✕   ✕   ✕       │ │  board: ticks and crosses settle
 │ └─────────────────────────────────┘ │
 │                                     │  bottom fifth left clear for the app's controls
 └─────────────────────────────────────┘
```

**Timeline** (`clipScenes`, pure and tested): an opening of 3 s with the story's count ("120 ways fit before any clue"); one scene a step, 4 to 9 s depending on the length of its worked line (about 30 characters a second to read, plus the count's fall); a closing of 4 s. Inside a step: the clues light at once, the count falls over 0.8 s from 0.4 s, the bar grows with it, newly settled cells appear one after another from 0.6 s. Six sets give clips of 17 to 40 seconds.

**Closing frame.** *Leave the last step*: "{n} ways left. One clue finishes it." and "Finish it on 99ile: {host}/practice/replay/{id}". *Show the answer*: "One arrangement left." with "Step {k} cut the most" and the link.

**Text.** Schibsted Grotesk, the site's font, loaded before drawing; sentence case; nothing smaller than 30 px on the 1080 frame (about 11 px on a phone held upright, the size of the app's own captions). Long lines wrap; a worked line longer than the space is cut at a word with "…" (none of the six needs it).

## The panel

"Make a clip" is a ghost button on the Replay page, beside the Watch controls and on the finished panel; it never takes the one filled button.

A sheet opens: the first frame as a still, the ending (Leave the last step, Show the answer), the theme (Light, Dark), and one filled button, **Make the video**. While it works: a bar with "Making the video, 40%". Then the video with its controls (it does not play by itself, so nothing moves under reduced motion), its length and size, **Share** where the phone can share files, **Save**, and **Save a picture**. If the browser can make neither MP4 nor WebM, the panel says so and offers the picture.

## Done when

Every one of the six replay sets makes an MP4 in Chrome that plays, lasts as long as `clipScenes` says, and is 1080 × 1920; the picture works in every browser; the first download stays within its budget; the panel is checked at 390 and 1440 wide in both themes.
