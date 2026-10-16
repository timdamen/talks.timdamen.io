# Social posts

`.github/workflows/social-posts.yml` announces talk updates on Bluesky, X and
LinkedIn once they're live on talks.timdamen.io:

| Change on the site                                           | Post                                                  |
| ------------------------------------------------------------ | ----------------------------------------------------- |
| A new talk with a future date                                | "🎤 New talk coming up! On {date} I'm speaking at …"  |
| Slides on a talk that has taken place (within the last year) | "📑 The slides of my talk "…" at … are now online:"   |
| A recording (a file in `src/data/videos/`)                   | "🎬 The recording of my talk "…" at … is now online:" |

Each post ends with a link to the talk or video page. The text is a fixed
template (`events.mjs`); long titles are shortened to fit X and Bluesky.

## How it works

- The workflow runs hourly on weekdays and reads the **live**
  `https://talks.timdamen.io/talks.json`, so nothing is announced before
  Vercel has deployed it.
- It posts **at most one announcement per working day** (Mon–Fri, excluding
  Dutch public holidays), at a random minute between **09:00 and 17:00
  Amsterdam time**. Further announcements wait for the next working days:
  upcoming talks first (soonest first), then slides and recordings (most
  recent talk first). An upcoming-talk announcement that hasn't gone out by
  the time the talk starts is dropped.
- `ledger.json` records what has been announced. The workflow commits it to
  `main` after each post (which also triggers a Vercel deploy, harmlessly).

## Setup: repository secrets

Add these under **GitHub → Settings → Secrets and variables → Actions →
New repository secret**. A platform is skipped until its secrets exist; if
none are set, nothing is posted and announcements stay pending.

### Bluesky

| Secret                 | Value                                                                   |
| ---------------------- | ----------------------------------------------------------------------- |
| `BLUESKY_HANDLE`       | Your handle, e.g. `timdamen.bsky.social` (or your custom-domain handle) |
| `BLUESKY_APP_PASSWORD` | Bluesky → Settings → Privacy and security → App passwords → Add         |

### X

1. In the [X developer portal](https://developer.x.com/en/portal/dashboard),
   create a project and app.
2. Under the app's **User authentication settings**, set app permissions to
   **Read and write**.
3. Under **Keys and tokens**, copy the API key and secret, then generate an
   access token and secret for your account. Generate them _after_ step 2,
   or they'll be read-only.

| Secret                  | Value                  |
| ----------------------- | ---------------------- |
| `X_API_KEY`             | API key (consumer key) |
| `X_API_SECRET`          | API key secret         |
| `X_ACCESS_TOKEN`        | Access token           |
| `X_ACCESS_TOKEN_SECRET` | Access token secret    |

Posting through the X API may need credits or a paid plan on the developer
account, depending on X's current pricing.

### LinkedIn

1. [Create an app](https://www.linkedin.com/developers/apps/new). LinkedIn
   requires associating it with a LinkedIn Page you admin.
2. On the app's **Products** tab, add **Share on LinkedIn** and **Sign In
   with LinkedIn using OpenID Connect**.
3. Open the
   [OAuth token generator](https://www.linkedin.com/developers/tools/oauth/token-generator),
   pick the app, select the scopes `openid`, `profile` and `w_member_social`,
   and generate a token.

| Secret                  | Value                                                               |
| ----------------------- | ------------------------------------------------------------------- |
| `LINKEDIN_ACCESS_TOKEN` | The generated token                                                 |
| `LINKEDIN_AUTHOR_URN`   | Optional: `urn:li:person:…`. Looked up from the token when not set. |

LinkedIn tokens **expire after 60 days**. When LinkedIn starts failing with
HTTP 401, generate a new token and update the secret. The API version
(`LinkedIn-Version`) is picked automatically; set a repository _variable_
`LINKEDIN_API_VERSION` (e.g. `202609`) to pin one.

## Trying it out

- **Actions → Social posts → Run workflow → `dry-run`** prints the pending
  announcements, today's slot, and the exact text per platform.
- **`post-now`** posts the next pending announcement immediately (still one).
- Locally: `node scripts/social/announce.mjs --mode dry-run`, and the tests
  with `node --test scripts/social/social.test.mjs`.

When a post fails, the workflow run fails, so GitHub emails you. Platforms
that did succeed aren't posted again; the failed one is retried on the next
working day, up to three times.

## The ledger

`ledger.json` maps `{slug}#{upcoming|slides|video}` to a status:

- `seeded` — was already on the site when the automation started
- `posted` — announced (`posts` holds the URLs per platform)
- `pending` — an attempt failed and will be retried
- `failed` — gave up after three attempts

To **skip** an announcement, add it as `{ "status": "skipped" }` before it
goes out. To **post one again**, or retry a `failed` one, delete its entry.
`lastPostDate` enforces the one-post-per-day limit.
