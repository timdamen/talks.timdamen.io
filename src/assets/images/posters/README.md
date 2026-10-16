# Talk posters

Promotional images (speaker cards, session posters, social banners) for past talks,
collected from event websites, Sessionize and social media.

## Layout

- One folder per event: `posters/<event-key>/`
- Files inside are named `<event-key>-NN.<ext>` (`01`, `02`, …), original format and resolution.
- Each folder has a `sources.json` listing every image with where it came from.
- `manifest.json` (this folder) maps each talk post in `src/data/blog/` to its event folder
  and images, so posts can reference them later (e.g. a `posters` frontmatter field using `image()`).

## sources.json entry

```json
{
  "file": "webdevcon-25-01.png",
  "imageUrl": "https://…/original.png",
  "pageUrl": "https://… page where it was found",
  "platform": "event-website | sessionize | linkedin | x | bluesky | instagram | other",
  "kind": "speaker-card | session-poster | lineup | event-poster | headshot | other",
  "description": "What the image shows"
}
```
