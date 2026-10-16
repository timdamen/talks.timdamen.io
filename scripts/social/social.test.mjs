// node --test scripts/social/

import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { composePost, currentEvents, fitText } from "./events.mjs";
import {
  escapeLittleText,
  oauthSignature,
  platforms,
  xLength,
} from "./platforms.mjs";
import {
  decide,
  isWorkingDay,
  localParts,
  localTime,
  postingSlot,
} from "./schedule.mjs";

const day = iso => {
  const [year, month, dayOfMonth] = iso.split("-").map(Number);
  return { year, month, day: dayOfMonth };
};

describe("schedule", () => {
  it("only treats Dutch working days as working days", () => {
    assert.equal(isWorkingDay(day("2026-10-16")), true); // Friday
    assert.equal(isWorkingDay(day("2026-10-17")), false); // Saturday
    assert.equal(isWorkingDay(day("2026-10-18")), false); // Sunday
    assert.equal(isWorkingDay(day("2026-01-01")), false); // New Year's Day
    assert.equal(isWorkingDay(day("2026-04-06")), false); // Easter Monday
    assert.equal(isWorkingDay(day("2026-04-27")), false); // King's Day
    assert.equal(isWorkingDay(day("2026-05-14")), false); // Ascension Day
    assert.equal(isWorkingDay(day("2026-05-25")), false); // Whit Monday
    assert.equal(isWorkingDay(day("2026-12-25")), false); // Christmas
    assert.equal(isWorkingDay(day("2026-05-05")), true); // not a lustrum year
    assert.equal(isWorkingDay(day("2025-05-05")), false); // Liberation Day 2025
    assert.equal(isWorkingDay(day("2027-03-29")), false); // Easter Monday 2027
  });

  it("converts Amsterdam wall-clock time across DST", () => {
    assert.equal(
      localTime(day("2026-01-15"), 9 * 60).toISOString(),
      "2026-01-15T08:00:00.000Z"
    );
    assert.equal(
      localTime(day("2026-07-15"), 9 * 60).toISOString(),
      "2026-07-15T07:00:00.000Z"
    );
  });

  it("picks a slot between 09:00 and 17:00 that varies per day", () => {
    const minutes = new Set();
    for (let i = 0; i < 400; i++) {
      const date = localParts(new Date(Date.UTC(2026, 0, 1 + i, 12)));
      const slot = localParts(postingSlot(date));
      assert.deepEqual(
        [slot.year, slot.month, slot.day],
        [date.year, date.month, date.day]
      );
      const minute = slot.hour * 60 + slot.minute;
      assert.ok(minute >= 9 * 60 && minute < 17 * 60, `${minute}`);
      minutes.add(minute);
    }
    assert.ok(minutes.size > 250, `only ${minutes.size} distinct slots`);
  });

  it("waits for, catches up on, or skips today's slot", () => {
    const slot = postingSlot(day("2026-10-16"));
    const at = offset => new Date(slot.getTime() + offset * 60_000);
    assert.deepEqual(decide(at(-30), {}), { action: "wait", slot });
    assert.deepEqual(decide(at(20), {}), { action: "post", slot });
    assert.equal(decide(at(-120), {}).action, "skip");
    assert.equal(
      decide(at(20), { lastPostDate: "2026-10-16" }).reason,
      "already posted today"
    );
    assert.equal(
      decide(new Date("2026-10-16T15:30:00Z"), {}).action,
      "skip" // 17:30 in Amsterdam
    );
    assert.match(
      decide(new Date("2026-10-17T10:00:00Z"), {}).reason,
      /not a working day/
    );
  });
});

const talk = overrides => ({
  title: "Your Biggest New Customer Can't See Pixels",
  description: "AI agents read your site through the accessibility tree.",
  url: "https://talks.timdamen.io/presentations/conf-26-pixels/",
  image: "https://talks.timdamen.io/presentations/conf-26-pixels/index.png",
  conference: "React Day Berlin",
  location: "Berlin, Germany",
  date: "2026-12-04T08:00:00.000Z",
  endDate: null,
  videoUrl: null,
  hasSlides: false,
  ...overrides,
});

describe("events", () => {
  const now = new Date("2026-10-16T10:00:00Z");

  it("announces upcoming talks, then slides and videos of past talks", () => {
    const events = currentEvents(
      [
        talk({ url: "https://x.test/presentations/later/" }),
        talk({
          url: "https://x.test/presentations/sooner/",
          date: "2026-10-21T08:00:00Z",
          hasSlides: true, // not announced before the talk
        }),
        talk({
          url: "https://x.test/presentations/older/",
          date: "2026-09-01T08:00:00Z",
          hasSlides: true,
          videoUrl: "https://x.test/videos/older/",
        }),
        talk({
          url: "https://x.test/presentations/recent/",
          date: "2026-10-15T18:00:00Z",
          hasSlides: true,
        }),
        talk({
          url: "https://x.test/presentations/ancient/",
          date: "2024-06-01T08:00:00Z",
          hasSlides: true,
        }),
      ],
      now
    );
    assert.deepEqual(
      events.map(e => e.id),
      [
        "sooner#upcoming",
        "later#upcoming",
        "recent#slides",
        "older#slides",
        "older#video",
      ]
    );
  });

  it("writes a deterministic post per event type", () => {
    const upcoming = composePost({ type: "upcoming", talk: talk() });
    assert.equal(
      upcoming.text(upcoming.title),
      `🎤 New talk coming up! On December 4, 2026 I'm speaking at React Day Berlin in Berlin, Germany:\n\n"Your Biggest New Customer Can't See Pixels"\n\nhttps://talks.timdamen.io/presentations/conf-26-pixels/`
    );
    const online = composePost({
      type: "upcoming",
      talk: talk({ location: "Online" }),
    });
    assert.match(online.text(online.title), /React Day Berlin \(online\):/);
    const video = composePost({
      type: "video",
      talk: talk({ videoUrl: "https://talks.timdamen.io/videos/conf-26/" }),
    });
    assert.equal(video.link, "https://talks.timdamen.io/videos/conf-26/");
    assert.match(video.text(video.title), /^🎬 The recording of my talk/);
  });

  it("shortens long titles to fit", () => {
    const post = composePost({
      type: "slides",
      talk: talk({ title: "word ".repeat(80).trim() }),
    });
    const text = fitText(post, xLength, 280);
    assert.ok(xLength(text) <= 280);
    assert.match(text, /word…"/);
  });
});

describe("platform text", () => {
  it("counts X's weighted length", () => {
    assert.equal(xLength("hi https://example.com/a/very/long/path"), 26);
    assert.equal(xLength("🎤 a"), 4);
  });

  it("signs OAuth 1.0a requests like X's documentation example", () => {
    const signature = oauthSignature(
      "POST",
      "https://api.twitter.com/1.1/statuses/update.json",
      {
        status: "Hello Ladies + Gentlemen, a signed OAuth request!",
        include_entities: "true",
        oauth_consumer_key: "xvz1evFS4wEEPTGEFPHBog",
        oauth_nonce: "kYjzVBB8Y0ZFabxSWbWovY3uYSQ2pTgmZeNu2VS4cg",
        oauth_signature_method: "HMAC-SHA1",
        oauth_timestamp: "1318622958",
        oauth_token: "370773112-GmHxMAgYyLbNEtIKZeRNFsMKPR9EyMZeS9weJAEb",
        oauth_version: "1.0",
      },
      "kAcSOqF21Fu85e7zjz7ZN2U4ZRhfV3WpwPAoE3Z7kBw",
      "LswwdoUaIvS8ltyTt5jkRh4J50vUPVVHtR2YPi5kE"
    );
    assert.equal(signature, "hCtSmYh+iHYCEqBWrE7C7hYmtUk=");
  });

  it("escapes LinkedIn little text, except in links", () => {
    assert.equal(
      escapeLittleText("The AST (part #1) https://x.test/a_(b)"),
      "The AST \\(part \\#1\\) https://x.test/a_(b)"
    );
  });
});

describe("publishing", () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  /** Replaces fetch with canned responses, recording every request. */
  const stubFetch = respond => {
    const calls = [];
    globalThis.fetch = async (url, init = {}) => {
      calls.push({ url: String(url), ...init });
      const {
        status = 200,
        json,
        headers = {},
        body,
      } = respond(String(url), init);
      return new Response(json ? JSON.stringify(json) : (body ?? ""), {
        status,
        headers,
      });
    };
    return calls;
  };

  const post = composePost({ type: "upcoming", talk: talk() });
  const byName = name => platforms.find(p => p.name === name);

  it("posts to Bluesky with a link facet and card", async () => {
    const calls = stubFetch(url => {
      if (url.endsWith("createSession")) {
        return {
          json: { accessJwt: "jwt", did: "did:plc:me", handle: "tim.test" },
        };
      }
      if (url.endsWith("index.png")) {
        return { body: "png", headers: { "content-type": "image/png" } };
      }
      if (url.endsWith("uploadBlob")) return { json: { blob: { ref: "b" } } };
      return { json: { uri: "at://did:plc:me/app.bsky.feed.post/3abc" } };
    });
    const url = await byName("bluesky").publish(post, {
      BLUESKY_HANDLE: "tim.test",
      BLUESKY_APP_PASSWORD: "app-password",
    });
    assert.equal(url, "https://bsky.app/profile/tim.test/post/3abc");
    const { record } = JSON.parse(calls.at(-1).body);
    const [facet] = record.facets;
    const linked = Buffer.from(record.text).subarray(
      facet.index.byteStart,
      facet.index.byteEnd
    );
    assert.equal(linked.toString(), "talks.timdamen.io/presentations/conf-26…");
    assert.equal(facet.features[0].uri, post.link);
    assert.deepEqual(record.embed.external.thumb, { ref: "b" });
    assert.equal(calls.at(-1).headers.Authorization, "Bearer jwt");
  });

  it("posts to X with an OAuth header", async () => {
    const calls = stubFetch(() => ({
      status: 201,
      json: { data: { id: "42" } },
    }));
    const url = await byName("x").publish(post, {
      X_API_KEY: "key",
      X_API_SECRET: "secret",
      X_ACCESS_TOKEN: "token",
      X_ACCESS_TOKEN_SECRET: "token-secret",
    });
    assert.equal(url, "https://x.com/i/web/status/42");
    assert.equal(calls[0].url, "https://api.x.com/2/tweets");
    assert.match(calls[0].headers.Authorization, /^OAuth .*oauth_signature="/);
    assert.equal(JSON.parse(calls[0].body).text, post.text(post.title));
  });

  it("posts to LinkedIn, stepping back past a retired API version", async () => {
    let versions = 0;
    const calls = stubFetch((url, init) => {
      if (url.endsWith("/v2/userinfo")) return { json: { sub: "abc" } };
      if (url.endsWith("index.png")) {
        return { body: "png", headers: { "content-type": "image/png" } };
      }
      if (url.includes("initializeUpload")) {
        return {
          json: {
            value: {
              uploadUrl: "https://upload.test/1",
              image: "urn:li:image:1",
            },
          },
        };
      }
      if (url === "https://upload.test/1") return { status: 201 };
      if (versions++ === 0 && init.headers["LinkedIn-Version"]) {
        return { status: 426, json: { code: "NONEXISTENT_VERSION" } };
      }
      return { status: 201, headers: { "x-restli-id": "urn:li:share:7" } };
    });
    const url = await byName("linkedin").publish(post, {
      LINKEDIN_ACCESS_TOKEN: "token",
    });
    assert.equal(url, "https://www.linkedin.com/feed/update/urn:li:share:7/");
    const created = calls.at(-1);
    assert.equal(created.url, "https://api.linkedin.com/rest/posts");
    const body = JSON.parse(created.body);
    assert.equal(body.author, "urn:li:person:abc");
    assert.equal(body.content.article.source, post.link);
    assert.equal(body.content.article.thumbnail, "urn:li:image:1");
    assert.match(body.commentary, /^🎤 New talk coming up!/);
  });
});
