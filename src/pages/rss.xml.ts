import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { getPath } from "@/utils/getPathBlog";
import getSortedPresentations from "@/utils/getSortedPresentations";
import { SITE } from "@/config";

export async function GET() {
  const presentations = await getCollection("blog");
  const sortedPresentations = getSortedPresentations(presentations);
  return rss({
    title: SITE.title,
    description: SITE.desc,
    site: SITE.website,
    xmlns: { atom: "http://www.w3.org/2005/Atom" },
    customData: [
      "<language>en</language>",
      `<atom:link href="${new URL("rss.xml", SITE.website).href}" rel="self" type="application/rss+xml"/>`,
    ].join(""),
    items: sortedPresentations.map(({ data, id, filePath }) => ({
      link: getPath(id, filePath),
      title: data.title,
      description: data.description,
      pubDate: new Date(data.modDatetime ?? data.pubDatetime),
    })),
  });
}
