# Chrome Web Store listing (F53, D111)

Paste these into the Developer Dashboard. The title and the summary come from the manifest (`extension/build.mjs`),
so they are shown here only to check. Images are in this folder.

## Store listing tab

**Title** (from the manifest, 38 characters)
99ile: CAT RC practice from any article

**Summary** (from the manifest, 104 characters)
Turn the essay or editorial you are reading into a free CAT-style RC set, answered in a panel beside it.

**Description** (paste as is; the store shows plain text)

99ile turns the essay or editorial you are already reading into CAT-style reading comprehension practice, in a panel beside the article. It is free.

HOW IT WORKS
1. Open an essay, an editorial or a long read.
2. Select a passage and click "Add to RC set" beside it; select more to add more parts. Or right-click a selection, click the 99ile icon to use the whole article, or press Alt+Shift+R.
3. The passage is highlighted on the page, where you read it. The panel says whether it is a good CAT read and how long it takes at CAT pace.
4. Tap "Make my set". In about half a minute you get four CAT-style questions in the panel: main idea, inference, tone and the author's view, with four close options each.
5. Answer against the clock, then review every option and the trap behind each wrong one.

WHAT MAKES IT DIFFERENT
- Questions are checked before you see them: a second AI answers each one without the key, and any question it gets wrong is left out.
- "Show me in the article": in review, the line that decides each answer is highlighted on the page itself.
- Save words you meet: select a word and click "Add to my words", then write its meaning in your own words. It comes back for spaced review.
- It joins the rest of your preparation on 99ile.in: every set, score and mistake is saved to your account, mistakes go to your error log and redo queue, and your plan ticks itself.

FREE
Two new sets a day, free. An article someone has practised before is ready at once and does not count. History, error log and words are kept with no time limit.

PRIVACY
The extension reads a page only when you click its icon, its "Add to RC set" button, its right-click entry or its shortcut. It never sees your browsing history. The button on every site is off until you turn it on, and Chrome asks you first. Nothing leaves your browser until you tap "Make my set", and then only the paragraphs used for your set are sent. Until you turn the button on for every site, it has access to 99ile.in alone. Details: https://99ile.in/privacy

Works in Chrome, Edge and Brave on a computer. On a phone, paste the article on https://99ile.in/practice/article instead.

**Category:** Education
**Language:** English
**Website:** https://99ile.in
**Support:** https://99ile.in/contact

**Images (this folder)**
- Store icon: `icon-128.png`
- Screenshots, in this order: `shot-1-passage.png`, `shot-2-questions.png`, `shot-3-review.png`, `shot-4-words.png`,
  `shot-5-saved.png`
- Small promo tile: `promo-440x280.png`
- Marquee promo tile (optional): `marquee-1400x560.png`

## Privacy practices tab

**Single purpose**
Make reading-comprehension practice for the CAT exam from the article the user is reading: read the passage the user chooses, after a click, and open 99ile in the side panel to make and answer a question set on it.

**Permission justification**
- activeTab: To read the article in the current tab, only after the user clicks the 99ile icon, chooses its right-click entry or presses its shortcut. It gives access to that one tab and ends when the user leaves the page.
- scripting: To run the reader on that tab after the click: it takes the selected text, or the article's main text, and highlights the passage and the deciding lines on the page.
- contextMenus: To add "Make an RC set from this" and "Add to my words" to the right-click menu for selected text.
- sidePanel: To show 99ile beside the article, so the user answers the questions while the article stays open.
- storage: To hand the text just read to the side panel (held in session storage for a moment, then deleted).
- Host permission (https://99ile.in/*): The side panel shows 99ile.in itself; access to this one site keeps the user signed in to their own 99ile account inside the panel.
- Optional host permission (<all_urls>), off by default: requested only if the user turns on "Add to RC set as you select" in the side panel. It lets a small script show a button beside text the user selects on any site. The script reads nothing else and sends nothing until the user clicks that button. Without it, the button appears only on a page where the user already clicked the 99ile icon or its right-click entry.

**Are you using remote code?** No, I am not using remote code. (Everything, including Mozilla Readability, is in the package; the panel frames the 99ile.in website, which is a web page, not code run by the extension.)

**Data usage: what user data do you plan to collect?** Tick only:
- Website content: the text of the passage the user chooses, its title and address, sent to 99ile only when the user taps "Make my set", to write the question set.

(Authentication and account data belong to the 99ile website the user signs in to; the extension itself does not collect them.)

**Certify all three:** not sold to third parties; not used or transferred for purposes unrelated to the single purpose; not used to determine creditworthiness or for lending.

**Privacy policy URL:** https://99ile.in/privacy

## Distribution tab
Free. Visibility: Public. Regions: all.

## Test instructions (for the reviewer)
1. After installing, a 99ile tab opens. Sign in with any Google account (free; no other account is needed).
2. Open any long essay or editorial, for example https://aeon.co/essays (any article).
3. Click the 99ile icon in the toolbar (pin it from the puzzle-piece menu), or select a few paragraphs, right-click and choose "Make an RC set from this". The side panel opens and the passage is highlighted on the page.
4. Click "Make my set". About 30 seconds later the questions appear in the panel. Answer, submit, and in review click "Show me in the article" to see the deciding line highlighted on the page.
5. Right-click a single word on the page and choose "Add to my words" to save it.
Each account can make two new sets a day.
