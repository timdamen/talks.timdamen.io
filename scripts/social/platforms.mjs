// Publishing to Bluesky, X and LinkedIn. Each platform is enabled by setting
// its secrets (see README.md) and renders the shared post to its own limits.

import { createHmac, randomBytes } from "node:crypto";
import { fitText } from "./events.mjs";

const graphemes = new Intl.Segmenter("en", { granularity: "grapheme" });

async function request(label, url, init) {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = (await res.text()).slice(0, 500);
    const error = new Error(`${label}: HTTP ${res.status} ${body}`);
    error.status = res.status;
    throw error;
  }
  return res;
}

/** The post's image, if it is small enough and of an accepted type. */
async function fetchImage(url, { types, maxBytes }) {
  if (!url) return null;
  const res = await fetch(url);
  const type = res.headers.get("content-type")?.split(";")[0];
  if (!res.ok || !types.includes(type)) return null;
  const bytes = Buffer.from(await res.arrayBuffer());
  return bytes.length <= maxBytes ? { bytes, type } : null;
}

const warn = (platform, what, error) =>
  process.stderr.write(`${platform}: ${what} skipped: ${error.message}\n`);

// --- Bluesky -----------------------------------------------------------------

const BLUESKY = "https://bsky.social/xrpc";

/** Links show shortened in the text, like Bluesky's own clients do. */
const displayUrl = url => {
  const bare = url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return bare.length > 40 ? `${bare.slice(0, 39)}…` : bare;
};

const blueskyText = post => {
  const shown = displayUrl(post.link);
  const length = text => [...graphemes.segment(text)].length;
  const text = fitText(
    post,
    text => length(text.replace(post.link, shown)),
    300
  ).replace(post.link, shown);
  return { text, shown };
};

const xrpc = (method, { token, json, body, type }) =>
  request(`Bluesky ${method}`, `${BLUESKY}/${method}`, {
    method: "POST",
    headers: {
      "Content-Type": type ?? "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: json ? JSON.stringify(json) : body,
  }).then(res => res.json());

const bluesky = {
  name: "bluesky",
  label: "Bluesky",
  configured: env => Boolean(env.BLUESKY_HANDLE && env.BLUESKY_APP_PASSWORD),
  render: post => blueskyText(post).text,
  async publish(post, env) {
    const { text, shown } = blueskyText(post);
    const session = await xrpc("com.atproto.server.createSession", {
      json: {
        identifier: env.BLUESKY_HANDLE,
        password: env.BLUESKY_APP_PASSWORD,
      },
    });
    const token = session.accessJwt;

    const byteStart = Buffer.byteLength(text.slice(0, text.indexOf(shown)));
    const external = {
      uri: post.link,
      title: post.title,
      description:
        post.description.length > 300
          ? `${post.description.slice(0, 299)}…`
          : post.description,
    };
    try {
      const image = await fetchImage(post.image, {
        types: ["image/png", "image/jpeg", "image/webp"],
        maxBytes: 1_000_000,
      });
      if (image) {
        const { blob } = await xrpc("com.atproto.repo.uploadBlob", {
          token,
          body: image.bytes,
          type: image.type,
        });
        external.thumb = blob;
      }
    } catch (error) {
      warn("Bluesky", "link card image", error);
    }

    const { uri } = await xrpc("com.atproto.repo.createRecord", {
      token,
      json: {
        repo: session.did,
        collection: "app.bsky.feed.post",
        record: {
          $type: "app.bsky.feed.post",
          text,
          langs: ["en"],
          createdAt: new Date().toISOString(),
          facets: [
            {
              index: {
                byteStart,
                byteEnd: byteStart + Buffer.byteLength(shown),
              },
              features: [
                { $type: "app.bsky.richtext.facet#link", uri: post.link },
              ],
            },
          ],
          embed: { $type: "app.bsky.embed.external", external },
        },
      },
    });
    return `https://bsky.app/profile/${session.handle}/post/${uri.split("/").at(-1)}`;
  },
};

// --- X -----------------------------------------------------------------------

const X_TWEETS = "https://api.x.com/2/tweets";

/** RFC 3986 percent-encoding, as OAuth 1.0a requires. */
const percent = value =>
  encodeURIComponent(value).replace(
    /[!'()*]/g,
    c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  );

/** OAuth 1.0a HMAC-SHA1 signature over the request's parameters. */
export function oauthSignature(
  method,
  url,
  params,
  consumerSecret,
  tokenSecret
) {
  const normalized = Object.keys(params)
    .sort()
    .map(key => `${percent(key)}=${percent(params[key])}`)
    .join("&");
  const base = [method.toUpperCase(), percent(url), percent(normalized)].join(
    "&"
  );
  return createHmac(
    "sha1",
    `${percent(consumerSecret)}&${percent(tokenSecret)}`
  )
    .update(base)
    .digest("base64");
}

function oauthHeader(method, url, env) {
  const params = {
    oauth_consumer_key: env.X_API_KEY,
    oauth_nonce: randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_token: env.X_ACCESS_TOKEN,
    oauth_version: "1.0",
  };
  params.oauth_signature = oauthSignature(
    method,
    url,
    params,
    env.X_API_SECRET,
    env.X_ACCESS_TOKEN_SECRET
  );
  return `OAuth ${Object.keys(params)
    .sort()
    .map(key => `${percent(key)}="${percent(params[key])}"`)
    .join(", ")}`;
}

/** X's weighted length: links count as 23, emoji and CJK as 2. */
export function xLength(text) {
  let length = 0;
  for (const part of text.split(/(https?:\/\/\S+)/)) {
    if (/^https?:\/\//.test(part)) {
      length += 23;
      continue;
    }
    for (const { segment } of graphemes.segment(part)) {
      const code = segment.codePointAt(0);
      const light =
        segment.length === 1 &&
        (code <= 0x10ff ||
          (code >= 0x2000 && code <= 0x200d) ||
          (code >= 0x2010 && code <= 0x201f) ||
          (code >= 0x2032 && code <= 0x2037));
      length += light ? 1 : 2;
    }
  }
  return length;
}

const x = {
  name: "x",
  label: "X",
  configured: env =>
    Boolean(
      env.X_API_KEY &&
      env.X_API_SECRET &&
      env.X_ACCESS_TOKEN &&
      env.X_ACCESS_TOKEN_SECRET
    ),
  render: post => fitText(post, xLength, 280),
  async publish(post, env) {
    const res = await request("X", X_TWEETS, {
      method: "POST",
      headers: {
        Authorization: oauthHeader("POST", X_TWEETS, env),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: x.render(post) }),
    });
    const { data } = await res.json();
    return `https://x.com/i/web/status/${data.id}`;
  },
};

// --- LinkedIn ----------------------------------------------------------------

const LINKEDIN = "https://api.linkedin.com";

/**
 * Post commentary uses LinkedIn's "little text" format, where these
 * characters are markup unless escaped. Links are left alone.
 */
export const escapeLittleText = text =>
  text
    .split(/(https?:\/\/\S+)/)
    .map((part, i) =>
      i % 2 ? part : part.replace(/[\\|{}@[\]()<>#*_~]/g, "\\$&")
    )
    .join("");

/**
 * LinkedIn's REST API needs a `LinkedIn-Version` (YYYYMM) that is still
 * supported, roughly the last twelve months. Start from last month and step
 * back when a version turns out not to exist.
 */
function linkedInVersions(env) {
  if (env.LINKEDIN_API_VERSION) return [env.LINKEDIN_API_VERSION];
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const month = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1 - i, 1)
    );
    return `${month.getUTCFullYear()}${String(month.getUTCMonth() + 1).padStart(2, "0")}`;
  });
}

async function linkedInRest(env, path, init) {
  let lastError;
  for (const version of linkedInVersions(env)) {
    try {
      return await request(`LinkedIn ${path}`, `${LINKEDIN}/rest/${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${env.LINKEDIN_ACCESS_TOKEN}`,
          "LinkedIn-Version": version,
          "X-Restli-Protocol-Version": "2.0.0",
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      if (error.status !== 426) throw error;
      lastError = error;
    }
  }
  throw lastError;
}

async function linkedInAuthor(env) {
  if (env.LINKEDIN_AUTHOR_URN) return env.LINKEDIN_AUTHOR_URN;
  const res = await request("LinkedIn userinfo", `${LINKEDIN}/v2/userinfo`, {
    headers: { Authorization: `Bearer ${env.LINKEDIN_ACCESS_TOKEN}` },
  });
  const { sub } = await res.json();
  return `urn:li:person:${sub}`;
}

async function linkedInThumbnail(env, author, imageUrl) {
  const image = await fetchImage(imageUrl, {
    types: ["image/png", "image/jpeg", "image/gif"],
    maxBytes: 5_000_000,
  });
  if (!image) return null;
  const res = await linkedInRest(env, "images?action=initializeUpload", {
    method: "POST",
    body: JSON.stringify({ initializeUploadRequest: { owner: author } }),
  });
  const { value } = await res.json();
  await request("LinkedIn image upload", value.uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${env.LINKEDIN_ACCESS_TOKEN}`,
      "Content-Type": image.type,
    },
    body: image.bytes,
  });
  return value.image;
}

const linkedin = {
  name: "linkedin",
  label: "LinkedIn",
  configured: env => Boolean(env.LINKEDIN_ACCESS_TOKEN),
  render: post => post.text(post.title),
  async publish(post, env) {
    const author = await linkedInAuthor(env);
    const article = {
      source: post.link,
      title: post.title,
      description: post.description,
    };
    try {
      const thumbnail = await linkedInThumbnail(env, author, post.image);
      if (thumbnail) article.thumbnail = thumbnail;
    } catch (error) {
      warn("LinkedIn", "link card image", error);
    }
    const res = await linkedInRest(env, "posts", {
      method: "POST",
      body: JSON.stringify({
        author,
        commentary: escapeLittleText(linkedin.render(post)),
        visibility: "PUBLIC",
        distribution: {
          feedDistribution: "MAIN_FEED",
          targetEntities: [],
          thirdPartyDistributionChannels: [],
        },
        content: { article },
        lifecycleState: "PUBLISHED",
        isReshareDisabledByAuthor: false,
      }),
    });
    return `https://www.linkedin.com/feed/update/${res.headers.get("x-restli-id")}/`;
  },
};

export const platforms = [bluesky, x, linkedin];
