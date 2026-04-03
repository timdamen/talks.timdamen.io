---
name: add-video
description: Add a video recording to an existing talk. Use when a conference talk has been recorded and the video URL is available.
argument-hint: "[talk-filename] [video-url]"
---

# Add Video Recording to an Existing Talk

You are adding a video recording for an existing talk in this project. The user will provide a talk filename and a video URL (and optionally other overrides).

## Inputs

- `$0` — The talk filename (without extension) from `src/data/blog/`, e.g. `Øredev-25`
- `$1` — The video embed URL (YouTube `https://www.youtube.com/embed/...` or Vimeo `https://player.vimeo.com/video/...`)

If arguments are missing, ask the user for them. Specifically you need:
1. **Which talk** — the filename in `src/data/blog/` (list available talks that don't yet have a video file to help the user pick)
2. **Video embed URL** — must be an embeddable URL (YouTube embed or Vimeo player format)

Optionally ask:
3. **OG image** — a specific image for the video card, or reuse the talk's `ogImage`
4. **Featured** — should this video be featured on the homepage? (default: `false`)

## Steps

### Step 1: Verify the talk exists and no video file exists yet

- Read the talk file at `src/data/blog/$0.md`
- If it doesn't exist, list available talks in `src/data/blog/` and ask the user to pick one
- Check if `src/data/videos/$0.md` already exists — if so, warn the user and ask if they want to update it instead

### Step 2: Create the video markdown file

Create `src/data/videos/$0.md` by copying the frontmatter from the blog file with these rules:

**Copy these fields exactly from the blog file:**
- `title`
- `author`
- `pubDatetime`
- `conference`
- `conferenceDate`
- `conferenceVenue`
- `conferenceLocation`
- `conferenceLat`
- `conferenceLong`
- `conferenceURL`
- `conferenceLogo`
- `conferenceSlides`
- `googleDrivePresentationsLink`
- `slug`
- `tags`
- `description`

**Set these fields:**
- `conferenceVideo` — the embed URL provided by the user ($1)
- `ogImage` — use the user-provided image, or reuse the blog file's `ogImage`
- `featured` — use the user-provided value, or default to `false`
- `draft: false`

**Do NOT copy:**
- `presentationImages` or any HTML comments from the blog file body

**Copy the body content** (everything after the frontmatter `---`) from the blog file — typically the `## Resources` section.

### Step 3: Update the README.md

Look at the existing entry for this talk in the root `README.md`. The README lists talks under year headings in this format:

```markdown
- **[Talk Title](https://talks.timdamen.io/presentations/slug)**  
  *Conference Name* | Date | Location
```

Add a video link to the matching entry by appending ` | [Video](https://talks.timdamen.io/videos/video-slug)` to the conference info line:

```markdown
- **[Talk Title](https://talks.timdamen.io/presentations/slug)**  
  *Conference Name* | Date | Location | [Video](https://talks.timdamen.io/videos/video-slug)
```

### Step 4: Summary

Show the user:
- The video file that was created
- The video URL that will be live at `https://talks.timdamen.io/videos/{slug}`
- The README change made
- Remind them to add an OG image to `src/assets/images/` if they provided a new one
