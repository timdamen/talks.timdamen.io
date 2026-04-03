---
name: add-talk
description: Add a new upcoming talk/presentation to the site by creating a blog markdown file and updating the README
argument-hint: "[conference-name]"
disable-model-invocation: true
allowed-tools: Read Edit Write Bash Grep Glob Agent AskUserQuestion WebSearch
---

# Add a New Upcoming Talk

You are adding a new upcoming presentation to this Astro-based talks website.

## Step 1: Gather information

Ask the user for the following details (use AskUserQuestion). You can ask for all of them at once:

**Required:**
- Talk title
- Conference name
- Conference date and time (with timezone)
- Conference venue name
- Conference location (City, Country)

**Optional (ask but allow skipping):**
- Conference website URL
- Whether the talk is in-person or online
- Talk description
- Tags (defaults: Conference, Talk + "In Person" or "online")
- Whether a conference logo file already exists in `src/assets/logos/`

If the user provided some of this info via `$ARGUMENTS`, don't re-ask for what's already known.

## Step 2: Look up coordinates

Use WebSearch or the user's input to find the latitude and longitude of the conference venue/city for the map pin. Round to 4-6 decimal places.

## Step 3: Create the markdown file

Create a new file in `src/data/blog/` following these conventions:

**Filename:** `{conference-name-lowercase}-{2-digit-year}.md`
Examples: `devcon-25.md`, `JSNation-25.md`, `oredev-25.md`

**Generate a slug:** `{filename-without-ext}-{title-slugified}`
Example: `devcon-25-stuck-in-a-focustrap-keyboard-accessibility-focus`

**Template:**

```markdown
---
title: '{talk title}'
author: 'Tim Damen'
pubDatetime: {conferenceDate in ISO 8601}
conference: {conference name}
conferenceDate: {date in ISO 8601, e.g. 2026-05-20T14:00:00Z}
conferenceVenue: {venue name}
conferenceLocation: {City, Country}
conferenceLat: {latitude}
conferenceLong: {longitude}
conferenceURL: {url if provided}
conferenceLogo: ../../assets/logos/{logo-filename if exists}
slug: {generated slug}
featured: false
draft: false
tags:
  - {tag1}
  - {tag2}
  - {In Person or online}
  - Talk
description: "{description if provided, otherwise leave empty}"
---

## Resources
The following resources were mentioned in the talk, used for research, or are otherwise relevant:

```

**Notes:**
- Always wrap `title` and `description` values in double quotes to avoid YAML parsing issues with colons or special characters
- Omit fields that have no value (don't include empty fields like `conferenceURL:` with no value)
- `pubDatetime` and `conferenceDate` are typically set to the same value
- Check `src/assets/logos/` for existing logo files before referencing one
- The `conferenceDate` MUST be in the future for it to appear as "upcoming"

## Step 4: Update the README.md

Add the new talk to the **"Upcoming presentations"** section in `README.md`. Insert it in chronological order among existing upcoming talks.

Format:
```
- **[{Talk Title}](https://talks.timdamen.io/presentations/{slug})**  
  *{Conference Name}* | {Month Day, Year} | {City, Country}
```

If the talk is online/remote, append `(Remote/Online talk)` to the location.

## Step 5: Confirm

Tell the user:
- The file that was created and its path
- That it was added to the README
- Remind them they can later add: conference logo, slides PDF, OG image, video embed, and resources
- Suggest running `npm run dev` to preview
