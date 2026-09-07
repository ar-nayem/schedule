# Schedule → Calendar

A tool your classmates can use to turn a screenshot of their timetable into a
calendar file (.ics) they import into Google Calendar, Apple Calendar, or
Outlook themselves. No login, no access to anyone's Google account — it
never touches Google's API at all.

## How it works

1. Student uploads a screenshot of their timetable.
2. The `/api/parse` function sends it to Claude (vision) and gets back a
   structured list of class sessions (course, day, periods, weeks, room,
   teacher).
3. The student reviews/corrects that list in the browser (OCR isn't
   perfect — this step catches mistakes before anything is generated).
4. The student fills in two things that vary by school/program:
   - the calendar date of the Monday of Week 1 of their term
   - the actual clock time for each period range used (e.g. "Period 1-2 =
     08:00-09:50") — this is NOT guessed, because different programs use
     different period lengths.
5. The browser builds a `.ics` file client-side (no server involved in this
   step) and downloads it.

## Deploy it (takes about 5 minutes)

You need a free [Vercel](https://vercel.com) account and an
[Anthropic API key](https://console.anthropic.com) (this is a *developer*
API key, separate from a claude.ai subscription — it's pay-as-you-go).

```bash
npm install -g vercel
cd schedule2ics
vercel
```

Follow the prompts (link/create a project). Then set your API key:

```bash
vercel env add ANTHROPIC_API_KEY
```

Paste your key when asked, choose all environments, then redeploy:

```bash
vercel --prod
```

Vercel gives you a URL like `schedule2ics.vercel.app` — that's the link you
hand your classmates.

## Cost and limits to know about (read this before sharing the link widely)

- Each screenshot parse is one Claude API call using `claude-haiku-4-5`,
  the cheapest current vision model — a single timetable image costs a
  fraction of a cent. Fine for a class of dozens; if hundreds of people use
  it, check your Anthropic usage dashboard.
- **The API key is yours and the bill is yours.** There's no per-user login
  or rate limiting in this MVP, so if you hand the link out publicly (not
  just to your class group chat), anyone could hit `/api/parse` and spend
  your API credits. For a class-sized group this is a non-issue; don't post
  the link somewhere public without adding a rate limit or a shared
  password first.
- The vision parsing won't always be perfect on the first try — table
  screenshots with dense mixed-language text (Chinese course names, small
  fonts) can get a period number or week range wrong. That's exactly why
  step 3 (the editable review table) exists — tell classmates to actually
  check it rather than blindly clicking through.
- Calendar times are hardcoded to the `Asia/Shanghai` timezone in
  `index.html` (search for `Asia/Shanghai`). If any classmate is on a
  different timezone's academic calendar, that string needs to change for
  them, or you turn it into a dropdown.
- This assumes everyone's timetable image looks structurally like yours
  (a weekly grid with period numbers, week ranges, room, teacher). If some
  classmates are on a completely different format, the extraction prompt
  in `api/parse.js` may need tweaking for their case.

## Files

- `index.html` — the whole frontend (plain HTML/JS, no build step, no
  framework).
- `api/parse.js` — the one serverless function, proxies to the Anthropic
  API so your API key never reaches the browser.
- `package.json` — only used for `vercel dev` locally; there are no real
  dependencies.
