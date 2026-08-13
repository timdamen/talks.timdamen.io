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

/**
 * Business/contact details. Rendered as plain text in the footer and as
 * LocalBusiness structured data, so search engines can tie the site to a real
 * entity. Keep this in sync with any other listing (Google Business Profile,
 * KvK) — inconsistent NAP data hurts local ranking.
 */
export const BUSINESS = {
  name: "Tim Damen",
  streetAddress: "Ligusterweg 38",
  postalCode: "2142 GL",
  addressLocality: "Cruquius",
  addressRegion: "Noord-Holland",
  addressCountry: "NL",
  // International format, e.g. "+31 6 12 34 56 78". Leave empty to hide.
  telephone: "",
  email: "hello@timdamen.io",
} as const;
