import type { CollectionEntry } from "astro:content";

const getupcomingPresentations = (presentations: CollectionEntry<"blog">[]) => {
  return presentations
    .filter(
      post =>
        post.data.conferenceDate &&
        new Date(post.data.conferenceDate).getTime() > Date.now()
    )
    .sort(
      (a, b) =>
        Math.floor(new Date(a.data.conferenceDate!).getTime() / 1000) -
        Math.floor(new Date(b.data.conferenceDate!).getTime() / 1000)
    );
};



export default getupcomingPresentations;
