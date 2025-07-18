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
    items: sortedPresentations.map(({ data, id, filePath }) => ({
      link: getPath(id, filePath),
      title: data.title,
      description: data.description,
      pubDate: new Date(data.modDatetime ?? data.pubDatetime),
    })),
  });
}
