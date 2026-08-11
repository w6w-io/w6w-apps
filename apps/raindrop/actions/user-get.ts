import type { ActionDefinition } from "@w6w/types";
import { RaindropClient } from "../lib/client.ts";

/**
 * `GET /rest/v1/user` — the connected account.
 *
 * This is also the credential probe (`auth/probe.ts`) and the quota source
 * (`health/quota.ts`), for the reasons documented there: it requires a
 * credential, it is not scope-restricted, and its documented schema contains no
 * credential material — the alarmingly-named `password` field is a **boolean**
 * meaning "does this account have a password", not a password.
 *
 * ## Why the response is projected rather than passed through
 *
 * The vendor warns, on this page and three others: "Our API response could
 * contain **other fields**, not described above. It's **unsafe to use** them in
 * your integration! They could be removed or renamed at any time."
 *
 * A workflow step's result is persisted in the run record and routinely echoed
 * into logs, other apps and human-readable previews. Passing an
 * explicitly-unstable object straight through would build workflows on fields
 * the vendor has reserved the right to delete, *and* would forward whatever
 * Raindrop adds to this endpoint next — into a store the app does not control.
 * So this action returns exactly the documented fields and drops the rest.
 *
 * `email` is kept: it is the connected account's own address and it is the one
 * field that makes a "which account am I connected as" step answer the question.
 * `groups` is kept because it is the only place the root collection *order*
 * lives — the vendor's "Nested structure" page makes this call step 1 of 3 for
 * rebuilding the sidebar.
 */
const userGet: ActionDefinition<Record<string, never>> = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get Account",
  description:
    "Fetch the connected Raindrop.io account: name, email, plan, preferences, file-upload usage " +
    "and the `groups` array that holds root-collection order. Documented fields only.",
  params: [],
  output: [{ key: "user", type: "object", label: "Account" }],

  async execute(_input, ctx) {
    const body = await new RaindropClient(ctx).ok("/user");
    return { user: projectUser(body.user) };
  },
};

/**
 * Keep exactly the fields the reference documents for the authenticated user.
 *
 * Derived from the User page's three tables — "Main fields", "Config fields" and
 * "Other fields" — walked in full, so this is the vendor's own list rather than
 * a selection of the useful-looking ones. The linked-account flags collapse to
 * one boolean each because that is all they contain (`{enabled: bool}`).
 */
export function projectUser(user: unknown): Record<string, unknown> | undefined {
  if (!user || typeof user !== "object" || Array.isArray(user)) return undefined;
  const u = user as Record<string, unknown>;

  const config = u.config && typeof u.config === "object" && !Array.isArray(u.config)
    ? pick(u.config as Record<string, unknown>, [
      "broken_level",
      "font_color",
      "font_size",
      "lang",
      "last_collection",
      "raindrops_sort",
      "raindrops_view",
    ])
    : undefined;

  const files = u.files && typeof u.files === "object" && !Array.isArray(u.files)
    ? pick(u.files as Record<string, unknown>, ["used", "size", "lastCheckPoint"])
    : undefined;

  const linked: Record<string, boolean> = {};
  for (const provider of ["facebook", "twitter", "vkontakte", "google", "dropbox", "gdrive"]) {
    const value = u[provider];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      linked[provider] = (value as { enabled?: unknown }).enabled === true;
    }
  }

  const out: Record<string, unknown> = pick(u, [
    "_id",
    "email",
    "email_MD5",
    "fullName",
    "groups",
    "password",
    "pro",
    "proExpire",
    "registered",
  ]);
  if (config) out.config = config;
  if (files) out.files = files;
  if (Object.keys(linked).length > 0) out.linkedAccounts = linked;
  return out;
}

function pick(source: Record<string, unknown>, keys: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    if (source[key] !== undefined) out[key] = source[key];
  }
  return out;
}

export default userGet;
