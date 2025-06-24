import type { CollectionEntry } from "astro:content";
import getSortedPresentations from "./getSortedPresentations";
import { slugifyAll } from "./slugify";

const getPresentationsByTag = (presentations: CollectionEntry<"blog">[], tag: string) =>
  getSortedPresentations(
    presentations.filter(post => slugifyAll(post.data.tags).includes(tag))
  );

export default getPresentationsByTag;
