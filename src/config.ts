export const SITE = {
  website: "https://talks.timdamen.io", // replace this with your deployed domain
  author: "Tim Damen",
  profile: "https://satnaing.dev/",
  desc: "Here you will find all of Tim's talks with slides, videos, and other resources.",
  title: "TD Talks",
  ogImage: "stage2.webp",
  lightAndDarkMode: true,
  postPerIndex: 10,
  postPerPage: 999,
  scheduledPostMargin: 15 * 60 * 1000, // 15 minutes
  showArchives: false,
  showBackButton: true, // show back button in post detail
  editPost: {
    enabled: false,
    text: "Suggest Changes",
    url: "https://github.com/satnaing/astro-paper/edit/main/",
  },
  dynamicOgImage: true,
  dir: "ltr", // "rtl" | "auto"
  lang: "en", // html lang code. Set this empty and default will be "en"
  timezone: "Europe/Amsterdam", // Default global timezone (IANA format) https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
} as const;
