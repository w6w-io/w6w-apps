import type { ActionDefinition } from "@w6w/types";
import { RaindropClient } from "../lib/client.ts";

/**
 * `GET /rest/v1/backup` — generate a new backup.
 *
 * **A `GET` with side effects, and one that sends email.** It is typed `perform`
 * here regardless of its verb, because what an action *does* decides its type,
 * not which method the vendor chose. Every other backup route is plural
 * (`/backups`, `/backup/{id}.{format}`); this singular one is the only write.
 *
 * Two things it does not do: it does not return the backup, and it does not
 * return an id. The documented response is a **sentence** —
 *
 *     We will send you email with html export file when it be ready!
 *     Time depends on bookmarks count and queue.
 *
 * — not JSON. The shared client falls back to `{result: true, message: <text>}`
 * for a non-JSON body, which is why this action returns a `message` field rather
 * than a record. The new backup appears in List Backups once the queue gets to
 * it.
 *
 * Not idempotent: each call queues another backup and another email.
 */
const backupCreate: ActionDefinition<Record<string, never>> = {
  key: "backup-create",
  type: "perform",
  resource: "backup",
  title: "Generate Backup",
  description:
    "Queue a new backup of the whole account. Raindrop emails the export file when it is ready; " +
    "the backup then appears in List Backups. Returns a status sentence, not a file.",
  idempotent: false,
  params: [],
  output: [{ key: "message", type: "string", label: "Status message from Raindrop" }],

  async execute(_input, ctx) {
    const body = await new RaindropClient(ctx).json("/backup");
    return {
      message: typeof body.message === "string"
        ? body.message
        : "Backup queued. Raindrop will email the export file when it is ready.",
    };
  },
};

export default backupCreate;
