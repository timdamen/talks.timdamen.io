---
name: talk
description: Add a new (future) talk or update an existing talk on talks.timdamen.io — new slides, video recording, OG image, photos, logo, featured status, or corrected conference details. Use whenever Tim mentions adding a talk, updating a talk, adding slides, or adding a video/recording.
argument-hint: "[add <conference> | update <talk> <what changed>]"
allowed-tools: Read Edit Write Bash Grep Glob AskUserQuestion WebSearch WebFetch
---

# Manage a talk on talks.timdamen.io

This site has two content collections (see `src/content.config.ts`):

- `src/data/blog/{name}.md` — one file per **talk** → page at `/presentations/{slug}`
- `src/data/videos/{name}.md` — created only **after a recording exists** → page at `/videos/{slug}`

Decide the mode from the user's request:

- **ADD** — a new (usually future) talk → create a blog file + README "Upcoming presentations" entry.
- **UPDATE** — new info for an existing talk (slides, video, OG image, photos, featured, corrected details) → edit the blog file; a video additionally means creating the videos-collection file.

## Field semantics (read this before writing frontmatter)

| Field | Meaning / behavior |
|---|---|
| `title` | Talk title. Always wrap in double quotes (colons are common). |
| `author` | Always `"Tim Damen"`. |
| `pubDatetime` | **Visibility gate + sort key**, not a "created at" date. `postFilter` hides the entry from `/presentations`, homepage featured, and RSS until 15 min before this moment. Set it **equal to `conferenceDate`** so the talk automatically moves from "upcoming" to the past list once presented. Also switches the detail page between "Upcoming at" and "Presented at". |
| `modDatetime` | Only set when meaningfully updating a *published* (past) talk; it becomes the sort key on `/presentations`. Usually omitted. |
| `conference` | Conference name (quote if it contains special chars). |
| `conferenceDate` | The actual talk slot, ISO 8601 UTC (e.g. `2026-05-20T14:20:00Z`). Future date ⇒ shown on `/upcoming-talks` + homepage upcoming section + map. Also drives year grouping on `/presentations`. |
| `conferenceVenue` | Venue name (e.g. `Óbuda University`). |
| `conferenceLocation` | `City, Country`. Use `Online` for remote talks (suppresses the "in {location}" text). |
| `conferenceLat` / `conferenceLong` | Decimal coordinates of the venue for the MapLibre pin on `/upcoming-talks`. 4–6 decimals. |
| `conferenceURL` | Conference website. |
| `conferenceLogo` | `../../assets/logos/{file}` — file must exist in `src/assets/logos/`. The ConferenceInfoCard on the talk page only renders when `conferenceLogo`, `conference`, `conferenceDate`, `conferenceLocation`, `conferenceVenue`, and `conferenceURL` are **all** present. |
| `conferenceLogoBackground` | Optional CSS color behind the logo when it lacks contrast. |
| `conferenceSlides` | `../../assets/slides/{deck}.pdf`. This string is used as a **browser URL** by PDFCarousel, resolving to `/assets/slides/{deck}.pdf` — so the PDF must physically live in **`public/assets/slides/`** (there is no `src/assets/slides/`). Omit until slides exist; the page then shows "No slides available". |
| `googleDrivePresentationsLink` | External "open slides" link. Current convention: `https://slides.timdamen.io/presentations/{deck}` (older talks use Google Drive URLs). Only include together with `conferenceSlides`. |
| `ogImage` | Current convention: `https://slides.timdamen.io/thumbnails/{deck}.webp`. Older talks use local `../../assets/images/{name}-og.webp`. If omitted, a satori OG image is generated automatically — omitting is fine for a brand-new talk without a deck. |
| `conferenceVideo` | **Embed** URL only: `https://www.youtube.com/embed/{id}?rel=0` or `https://player.vimeo.com/video/{id}`. Convert watch/share URLs to embed form. Rendered as an iframe. |
| `presentationImages` | Optional photo gallery: array of `{src, alt, caption?}` with `src` under `public/` (e.g. `/assets/stage2.webp`). Alt text must be genuinely descriptive (Tim is an a11y specialist). |
| `slug` | Overrides the entry id ⇒ the URL. Convention: `{conf-short}-{yy}-{kebab-case-title}` (e.g. `webkonf-26-diving-into-the-toplayer-...`). Never change the slug of a published talk. |
| `featured` | Shows on homepage "Featured" sections. Passes through `postFilter`, so a **future-dated talk can never appear featured** — don't set `true` before the talk happens. |
| `draft` | `true` hides the page entirely. Normally `false`. |
| `tags` | Convention: topic tag (`Accessibility` or `Frontend`), `Conference`, `In Person` **or** `online`, `Talk`. |
| `description` | Required by the schema. 2–4 sentence abstract; used for meta/OG/cards. |
| `timezone` | Optional IANA tz for date display; rarely used. |

`{deck}` above = the slide-deck basename, e.g. `webkonf-hu-26-toplayer` — it ties together the PDF, thumbnail, and slides.timdamen.io link.

## Mode: ADD a new talk

### 1. Gather info

From `$ARGUMENTS` and conversation; ask (AskUserQuestion) only for what's missing.

Required: title, conference name, date+time of the slot, venue, location (City, Country / Online), conference URL.
Optional: description (draft one from the title/topic if Tim doesn't provide it, and say you did), tags topic (`Accessibility` vs `Frontend`), in-person vs online, deck name if slides already exist, logo file.

### 2. Coordinates & logo

- Find venue lat/long via WebSearch (or ask). Round to 4–6 decimals.
- Check `src/assets/logos/` for an existing logo for that conference (reuse across years, e.g. `webkonf.png`). If none, omit `conferenceLogo` and mention it can be added later.

### 3. Create `src/data/blog/{file}.md`

- **Filename**: `{conference-short}-{yy}.md` (e.g. `devdays-26.md`). Second talk at the same conference/year: add a short suffix (existing example: `webkonf-26-oss.md`).
- Follow the field table above. Include only fields that have real values — never emit empty keys.
- `pubDatetime` = `conferenceDate`.
- `featured: false`, `draft: false`.
- Body:

```markdown
## Resources

The following resources were mentioned in the talk, used for research, or are otherwise relevant:

- [Example resource](https://example.com)
```

(Leave the list empty or with known resources; Tim fills it in later.)

Use a recent file like `src/data/blog/webkonf-26.md` as the live reference for formatting.

### 4. Update `README.md`

Insert into **Upcoming presentations** in chronological order (soonest first):

```markdown
- **[{Title}](https://talks.timdamen.io/presentations/{slug})**  
  _{Conference}_ | {Month D, YYYY} | {City, Country}
```

Note: two trailing spaces after the title line, underscores for italics. Append ` (Remote/Online talk)` after the location for online talks.

## Mode: UPDATE an existing talk

### 1. Locate the talk

Find the file in `src/data/blog/` (grep by conference/title if the name is ambiguous). Read it fully before editing.

### 2. Apply the update by type

**Slides ready** (deck name `{deck}`, from slides.timdamen.io tooling):
- Confirm `public/assets/slides/{deck}.pdf` exists; if not, tell Tim to drop it there (don't invent it).
- Add/set: `conferenceSlides: ../../assets/slides/{deck}.pdf`, `googleDrivePresentationsLink: https://slides.timdamen.io/presentations/{deck}`, `ogImage: https://slides.timdamen.io/thumbnails/{deck}.webp` (unless a custom local OG image is preferred).

**Video recording available**:
1. Convert the URL to embed form (`youtube.com/watch?v=X` → `youtube.com/embed/X?rel=0`).
2. Add `conferenceVideo` to the **blog** file.
3. Create `src/data/videos/{same-filename}.md`: copy the blog file verbatim (frontmatter + body), then:
   - keep `conferenceVideo`
   - drop `presentationImages` and any HTML comments
   - ask whether the video card needs its own `ogImage` (e.g. a thumbnail frame) or reuses the talk's
   - ask whether to set `featured: true` (homepage "Featured videos")
4. In `README.md`, append ` | [Video](https://talks.timdamen.io/videos/{slug})` to the talk's info line.

**Talk has happened** (date passed, doing any update): move its README entry from *Upcoming presentations* into the correct `### {year}` section (newest first within the year), creating the year heading if needed.

**Photos**: add `presentationImages` (images in `public/`), with real alt text.

**Corrections** (date/venue/etc.): edit fields; keep `pubDatetime` in sync with `conferenceDate` for future talks. Never change `slug` on a published talk.

## Verify (both modes)

1. Frontmatter parses and referenced local assets exist (`src/assets/logos/...`, `public/assets/slides/...`).
2. Run `pnpm astro sync` — must exit clean. Beware: the `.astro` content cache can mask YAML errors; if something looks stale, delete the `.astro` directory and re-run. (`pnpm` is canonical here, not npm; `astro check` has ~134 pre-existing errors and is not a gate.)
3. Offer to preview with `pnpm dev`: check `/upcoming-talks` (map pin + card) for future talks, or the talk/video detail page for updates.
4. Summarize: file(s) touched, live URL(s) (`https://talks.timdamen.io/presentations/{slug}`, `/videos/{slug}`), README change, and anything still missing (logo, slides, OG image, resources).
