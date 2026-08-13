import type { APIRoute } from "astro";
import { getCollection, type CollectionEntry } from "astro:content";
import { getPath as getPresentationPath } from "@/utils/getPathBlog";
import { getPath as getVideoPath } from "@/utils/getPathVideo";
import getSortedPresentations from "@/utils/getSortedPresentations";
import getUpcomingPresentations from "@/utils/getUpcomingPresentations";
import { SITE } from "@/config";

type Entry = CollectionEntry<"blog"> | CollectionEntry<"videos">;

/** Absolute URL with a trailing slash, matching the sitemap and vercel.json. */
const absolute = (path: string) =>
  new URL(path.replace(/\/?$/, "/"), SITE.website).href;

/** Descriptions are free-form markdown; flatten them onto a single line. */
const oneLine = (text: string) => text.replace(/\s+/g, " ").trim();

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("en-GB", {
    dateStyle: "long",
    timeZone: SITE.timezone,
  }).format(date);

/** `- [Title — Conference, Location (date)](url): description` */
const toListItem = (entry: Entry, url: string) => {
  const { title, description, conference, conferenceLocation, conferenceDate } =
    entry.data;

  const context = [
    conference,
    conferenceLocation,
    conferenceDate && formatDate(conferenceDate),
  ]
    .filter(Boolean)
    .join(", ");

  const label = context ? `${title} — ${context}` : title;

  return `- [${oneLine(label)}](${url}): ${oneLine(description)}`;
};

const section = (heading: string, items: string[]) =>
  items.length ? [`## ${heading}`, "", ...items, ""].join("\n") : "";

export const GET: APIRoute = async () => {
  // Mirrors the site's own pages: upcoming talks are still scheduled (a future
  // pubDatetime), so they only get the draft filter, while everything else goes
  // through getSortedPresentations.
  const published = await getCollection("blog", ({ data }) => !data.draft);
  const videos = await getCollection("videos", ({ data }) => !data.draft);

  const upcoming = getUpcomingPresentations(published);
  const past = getSortedPresentations(published);
  const recordings = getSortedPresentations(videos);

  const body = [
    `# ${SITE.title}`,
    "",
    `> ${oneLine(SITE.desc)}`,
    "",
    `This site is the talk archive of ${SITE.author}. Every talk has its own page with the abstract, the conference and venue, a link to the slides, and — when the session was recorded — a link to the video. Topics are mostly web accessibility, HTML, CSS, JavaScript, web standards, and developer experience. Personal site: ${SITE.profile}`,
    "",
    section(
      "Upcoming talks",
      upcoming.map(entry =>
        toListItem(
          entry,
          absolute(getPresentationPath(entry.id, entry.filePath))
        )
      )
    ),
    section(
      "Past talks",
      past.map(entry =>
        toListItem(
          entry,
          absolute(getPresentationPath(entry.id, entry.filePath))
        )
      )
    ),
    section(
      "Recorded talks",
      recordings.map(entry =>
        toListItem(entry, absolute(getVideoPath(entry.id, entry.filePath)))
      )
    ),
    section("Pages", [
      `- [About ${SITE.author}](${absolute("/about")}): speaker bio, photos, and background for event organisers.`,
      `- [Upcoming talks](${absolute("/upcoming-talks")}): where ${SITE.author} is speaking next.`,
      `- [All talks](${absolute("/presentations")}): the complete talk archive.`,
      `- [All recordings](${absolute("/videos")}): talk recordings grouped by year.`,
      `- [Tags](${absolute("/tags")}): browse talks by topic.`,
      `- [Contact](${absolute("/contact")}): how to reach ${SITE.author} about speaking at your event.`,
    ]),
    section("Optional", [
      `- [RSS feed](${new URL("rss.xml", SITE.website).href}): new talks as they are published.`,
      `- [Sitemap](${new URL("sitemap-index.xml", SITE.website).href}): every indexable URL on this site.`,
    ]),
  ].join("\n");

  return new Response(body.replace(/\n{3,}/g, "\n\n").trimEnd() + "\n", {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
