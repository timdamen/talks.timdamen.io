// Turns the site's talks.json feed into announcements and their post text.

const YEAR = 365 * 24 * 60 * 60 * 1000;

const longDate = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "long",
  day: "numeric",
  year: "numeric",
});

export const slugOf = url =>
  new URL(url).pathname.split("/").filter(Boolean).at(-1);

/**
 * Everything worth announcing at `now`, most urgent first: upcoming talks
 * (soonest first, they expire once the talk starts), then slides and
 * recordings (most recent talk first).
 */
export function currentEvents(talks, now) {
  const events = [];
  for (const talk of talks) {
    const slug = slugOf(talk.url);
    const start = new Date(talk.date);
    const end = new Date(talk.endDate ?? talk.date);
    if (start > now) {
      events.push({ id: `${slug}#upcoming`, type: "upcoming", talk });
      continue;
    }
    // Backfilling an old talk is not news.
    if (now - end > YEAR) continue;
    if (talk.hasSlides && end <= now) {
      events.push({ id: `${slug}#slides`, type: "slides", talk });
    }
    if (talk.videoUrl) {
      events.push({ id: `${slug}#video`, type: "video", talk });
    }
  }
  const upcoming = ({ type }) => (type === "upcoming" ? 0 : 1);
  const time = ({ talk }) => new Date(talk.date).getTime();
  return events.sort(
    (a, b) =>
      upcoming(a) - upcoming(b) ||
      (a.type === "upcoming" ? time(a) - time(b) : time(b) - time(a)) ||
      a.id.localeCompare(b.id)
  );
}

/**
 * The announcement for an event. `text(title)` builds the message around a
 * (possibly shortened) title, so each platform can fit it to its own limit.
 */
export function composePost({ type, talk }) {
  const at = talk.conference ? ` at ${talk.conference}` : "";
  const link = type === "video" ? talk.videoUrl : talk.url;
  const text = {
    upcoming: title => {
      const where = !talk.location
        ? ""
        : talk.location === "Online"
          ? " (online)"
          : ` in ${talk.location}`;
      const date = longDate.format(new Date(talk.date));
      return `🎤 New talk coming up! On ${date} I'm speaking${at}${where}:\n\n"${title}"\n\n${link}`;
    },
    slides: title =>
      `📑 The slides of my talk "${title}"${at} are now online:\n\n${link}`,
    video: title =>
      `🎬 The recording of my talk "${title}"${at} is now online:\n\n${link}`,
  }[type];
  return {
    text,
    link,
    title: talk.title,
    description: talk.description,
    image: talk.image,
  };
}

/**
 * The post's text with the title shortened word by word until
 * `measure(text) <= limit`.
 */
export function fitText(post, measure, limit) {
  const words = post.title.split(" ");
  for (let count = words.length; count > 0; count--) {
    const title =
      count === words.length
        ? post.title
        : `${words
            .slice(0, count)
            .join(" ")
            .replace(/[\s,.:;-]+$/, "")}…`;
    const text = post.text(title);
    if (measure(text) <= limit) return text;
  }
  throw new Error(`Post does not fit in ${limit} characters: ${post.text("")}`);
}
