import type { APIRoute } from "astro";
import { getCollection, type CollectionEntry } from "astro:content";
import { getPath as getPresentationPath } from "@/utils/getPathBlog";
import { getPath as getVideoPath } from "@/utils/getPathVideo";
import { SITE } from "@/config";

/**
 * Machine-readable talk archive, consumed by https://timdamen.io/speaking.
 *
 * Every non-draft talk is listed, past and upcoming alike, newest first. The
 * split between "upcoming" and "past" is left to the consumer so it stays
 * correct between deploys of this site.
 */

/** Absolute URL with a trailing slash, matching the sitemap and vercel.json. */
const absolute = (path: string) =>
  new URL(path.replace(/\/?$/, "/"), SITE.website).href;

const oneLine = (text: string) => text.replace(/\s+/g, " ").trim();

/** Same resolution as the og:image in PostDetails.astro. */
const imageFor = ({ id, filePath, data }: CollectionEntry<"blog">) => {
  const { ogImage } = data;
  const path =
    typeof ogImage === "string"
      ? ogImage
      : (ogImage?.src ?? `${getPresentationPath(id, filePath)}/index.png`);
  return new URL(path, SITE.website).href;
};

export const GET: APIRoute = async () => {
  const presentations = await getCollection("blog", ({ data }) => !data.draft);
  const videos = await getCollection("videos", ({ data }) => !data.draft);
  const videoById = new Map(videos.map(video => [video.id, video]));

  const talks = presentations
    .filter(({ data }) => data.conferenceDate)
    .sort(
      (a, b) =>
        b.data.conferenceDate!.getTime() - a.data.conferenceDate!.getTime()
    )
    .map(entry => {
      const { data } = entry;
      const video = videoById.get(entry.id);
      return {
        title: oneLine(data.title),
        description: oneLine(data.description),
        url: absolute(getPresentationPath(entry.id, entry.filePath)),
        image: imageFor(entry),
        conference: data.conference ?? null,
        conferenceUrl: data.conferenceURL ?? null,
        location: data.conferenceLocation ?? null,
        venue: data.conferenceVenue ?? null,
        date: data.conferenceDate!.toISOString(),
        endDate: data.conferenceEndDate?.toISOString() ?? null,
        videoUrl: video
          ? absolute(getVideoPath(video.id, video.filePath))
          : null,
        tags: data.tags,
      };
    });

  return new Response(
    JSON.stringify({ site: SITE.website, talks }, null, 2) + "\n",
    { headers: { "Content-Type": "application/json; charset=utf-8" } }
  );
};
