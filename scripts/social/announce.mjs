#!/usr/bin/env node
/* eslint-disable no-console -- a CLI that reports what it does */

// Announces talk updates on social media: a new upcoming talk, slides added
// after a talk, or a recording. Run hourly by .github/workflows/social-posts.yml;
// see README.md next to this file.
//
//   node scripts/social/announce.mjs [--mode auto|dry-run|post-now|seed]
//                                    [--feed <url or file>] [--now <ISO date>]

import { readFile, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { setTimeout as sleep } from "node:timers/promises";
import { composePost, currentEvents } from "./events.mjs";
import { platforms } from "./platforms.mjs";
import { dateKey, decide, formatTime, localParts } from "./schedule.mjs";

const LEDGER = new URL("./ledger.json", import.meta.url);
const MAX_ATTEMPTS = 3;

const { values: args } = parseArgs({
  options: {
    mode: { type: "string", default: "auto" },
    feed: {
      type: "string",
      default:
        process.env.SOCIAL_FEED_URL || "https://talks.timdamen.io/talks.json",
    },
    now: { type: "string" },
  },
});

const clock = () => (args.now ? new Date(args.now) : new Date());

async function loadEvents(now) {
  const feed = /^https?:\/\//.test(args.feed)
    ? await fetch(args.feed, { headers: { "Cache-Control": "no-cache" } }).then(
        res => {
          if (!res.ok) throw new Error(`${args.feed}: HTTP ${res.status}`);
          return res.json();
        }
      )
    : JSON.parse(await readFile(args.feed, "utf8"));
  return currentEvents(feed.talks, now);
}

/** Events not announced yet, including ones whose earlier attempt failed. */
const pendingEvents = (events, ledger) =>
  events.filter(
    ({ id }) => (ledger.events[id]?.status ?? "pending") === "pending"
  );

async function saveLedger(ledger) {
  const events = Object.fromEntries(
    Object.entries(ledger.events).sort(([a], [b]) => a.localeCompare(b))
  );
  await writeFile(
    LEDGER,
    `${JSON.stringify({ ...ledger, events }, null, 2)}\n`,
    "utf8"
  );
}

async function main() {
  const ledger = JSON.parse(await readFile(LEDGER, "utf8"));
  let now = clock();
  let events = await loadEvents(now);

  if (args.mode === "seed") {
    // Mark everything already on the site as announced, so turning the
    // automation on doesn't flood the timelines with old news.
    for (const { id } of events) ledger.events[id] ??= { status: "seeded" };
    await saveLedger(ledger);
    console.log(`Seeded ${events.length} existing announcements.`);
    return;
  }

  let pending = pendingEvents(events, ledger);
  if (!pending.length) return console.log("Nothing new to announce.");
  console.log(
    `Pending, in order:\n${pending.map(e => `  - ${e.id}`).join("\n")}`
  );

  if (args.mode === "dry-run") {
    const decision = decide(now, ledger);
    console.log(
      `\nSchedule: ${decision.action}${decision.slot ? ` at ${formatTime(decision.slot)} Amsterdam time` : ""}${decision.reason ? ` (${decision.reason})` : ""}`
    );
    for (const event of pending) {
      const post = composePost(event);
      for (const platform of platforms) {
        const status = platform.configured(process.env)
          ? "configured"
          : "not configured";
        console.log(
          `\n--- ${event.id} on ${platform.label} (${status}) ---\n${platform.render(post)}`
        );
      }
    }
    return;
  }

  const enabled = platforms.filter(p => p.configured(process.env));
  if (!enabled.length) {
    return console.log(
      "No social accounts are configured yet, so nothing is posted. Add the secrets listed in scripts/social/README.md."
    );
  }

  if (args.mode === "auto") {
    const decision = decide(now, ledger);
    if (decision.action === "skip") {
      return console.log(`Not posting now: ${decision.reason}.`);
    }
    if (decision.action === "wait") {
      console.log(
        `Waiting for today's slot, ${formatTime(decision.slot)} Amsterdam time.`
      );
      await sleep(Math.max(0, decision.slot - now));
      now = clock();
      // The site may have changed while waiting.
      events = await loadEvents(now);
      pending = pendingEvents(events, ledger);
      if (!pending.length) return console.log("Nothing new to announce.");
    }
  } else if (args.mode !== "post-now") {
    throw new Error(`Unknown mode "${args.mode}"`);
  }

  // One announcement per day; the rest wait for the next working day.
  const event = pending[0];
  const post = composePost(event);
  const entry = (ledger.events[event.id] ??= {
    status: "pending",
    attempts: 0,
    posts: {},
  });
  const failures = [];
  for (const platform of enabled) {
    if (entry.posts[platform.name]) continue;
    try {
      entry.posts[platform.name] = await platform.publish(post, process.env);
      console.log(
        `Posted ${event.id} to ${platform.label}: ${entry.posts[platform.name]}`
      );
    } catch (error) {
      failures.push(error.message);
    }
  }

  if (failures.length) {
    entry.attempts += 1;
    entry.lastError = failures.join("\n");
    if (entry.attempts >= MAX_ATTEMPTS) entry.status = "failed";
  } else {
    entry.status = "posted";
    entry.postedAt = now.toISOString();
    delete entry.attempts;
    delete entry.lastError;
  }
  if (Object.keys(entry.posts).length) {
    ledger.lastPostDate = dateKey(localParts(now));
  }
  await saveLedger(ledger);

  if (failures.length) {
    console.error(
      `Failed to post ${event.id} (attempt ${entry.attempts} of ${MAX_ATTEMPTS}):\n${failures.join("\n")}`
    );
    process.exitCode = 1;
  }
}

await main();
