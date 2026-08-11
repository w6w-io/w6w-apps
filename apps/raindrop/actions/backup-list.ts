import type { ActionDefinition } from "@w6w/types";
import { RaindropClient } from "../lib/client.ts";

/**
 * `GET /rest/v1/backups` — the account's backups, newest first.
 *
 * Each item is `{_id, created}` and nothing else: a 24-character hex id and a
 * timestamp. The id is what the download route
 * (`/rest/v1/backup/{ID}.{html|csv}`) takes.
 *
 * **Plural** — `/backup` (singular) is the *generate* route and has a side
 * effect, which is an unusually consequential distinction for a one-letter
 * difference on a `GET`.
 *
 * Downloading a backup is deliberately not an action here: the route answers an
 * HTML or CSV *file*, and an Action hands structured data to the next workflow
 * step rather than a document. See the README.
 */
const backupList: ActionDefinition<Record<string, never>> = {
  key: "backup-list",
  type: "read",
  resource: "backup",
  title: "List Backups",
  description: "List the account's backups, newest first. Each carries the ID used by Raindrop's " +
    "backup download URL.",
  params: [],
  output: [{ key: "items", type: "array", label: "Backups" }],

  async execute(_input, ctx) {
    return { items: await new RaindropClient(ctx).items("/backups") };
  },
};

export default backupList;
