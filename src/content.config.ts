import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";
import { SITE } from "@/config";

export const BLOG_PATH = "src/data/blog";

const blog = defineCollection({
  loader: glob({ pattern: "**/[^_]*.md", base: `./${BLOG_PATH}` }),
  schema: ({ image }) =>
    z.object({
      author: z.string().default(SITE.author),
      pubDatetime: z.date(),
      modDatetime: z.date().optional().nullable(),
      conference: z.string().optional(),
      conferenceDate: z.date().optional(),
      conferenceLocation: z.string().optional(),
      googleDrivePresentationsLink: z.string().optional(),
      conferenceLat: z.number().optional(),
      conferenceLong: z.number().optional(),
      conferenceVenue: z.string().optional(),
      conferenceURL: z.string().optional(),
      conferenceLogo: image().or(z.string()).optional(),
      conferenceVideo: z.string().optional(),
      conferenceSlides: z.string().optional(),
      title: z.string(),
      featured: z.boolean().optional(),
      draft: z.boolean().optional(),
      tags: z.array(z.string()).default(["others"]),
      ogImage: image().or(z.string()).optional(),
      description: z.string(),
      canonicalURL: z.string().optional(),
      hideEditPost: z.boolean().optional(),
      timezone: z.string().optional(),
    }),
});

export const collections = { blog };
