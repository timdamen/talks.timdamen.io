export const SITE = {
  website: "https://talks.timdamen.io", // replace this with your deployed domain
  author: "Tim Damen",
  profile: "https://timdamen.io/",
  desc: "Tim Damen — frontend developer, web accessibility specialist, and co-founder of Focusring. International conference speaker and host of the focustrap podcast.",
  title: "Tim Damen's talks",
  ogImage: "", // empty string falls back to the generated /og.png (1200x630)
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
