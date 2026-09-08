import type { ActionDefinition } from "@w6w/types";
import { WebinarGeekClient } from "../lib/client.ts";

/**
 * `POST /episodes/{id}/broadcasts` — schedule a new broadcast for an existing Live or Automated
 * episode. On-demand episodes cannot receive a new broadcast this way.
 *
 * **`date` is ISO-8601 with a UTC offset** (`2025-07-09T14:30:00+02:00`), unlike almost every
 * other timestamp in this API, which is a Unix epoch integer — see `lib/client.ts`'s module doc.
 * It must be in the future.
 *
 * **Genuinely idempotent, not just retry-safe**: the vendor's own docs state this "[r]eturns the
 * created broadcast, or an existing broadcast if the datetime provided matches an existing
 * broadcast for the specified episode" — calling this twice with the same episode and date
 * returns the same broadcast rather than creating a duplicate.
 */
interface Input {
  episodeId: number;
  date: string;
}

const broadcastCreate: ActionDefinition<Input> = {
  key: "broadcast-create",
  type: "perform",
  resource: "broadcast",
  title: "Create Broadcast",
  description: "Schedule a new broadcast for a Live or Automated episode.",
  // WebinarGeek returns the existing broadcast when the date matches one already scheduled.
  idempotent: true,
  params: [
    {
      key: "episodeId",
      label: "Episode ID",
      type: "number",
      required: true,
      hint: "Find episode IDs via `webinar-get`/`webinar-list`'s nested `episodes`, or on a " +
        "broadcast's own nested `episode`.",
    },
    {
      key: "date",
      label: "Date and time",
      type: "datetime",
      required: true,
      hint: "ISO-8601 with a UTC offset, e.g. 2025-07-09T14:30:00+02:00. Must be in the future.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Broadcast ID" },
    { key: "date", type: "number", label: "Date (Unix timestamp)" },
    { key: "has_ended", type: "boolean", label: "Has ended" },
    { key: "episode", type: "object", label: "Parent episode" },
    { key: "webinar", type: "object", label: "Parent webinar" },
  ],

  execute(input, ctx) {
    return new WebinarGeekClient(ctx).request(`/episodes/${input.episodeId}/broadcasts`, {
      method: "POST",
      body: { episode_id: input.episodeId, date: input.date },
    });
  },
};

export default broadcastCreate;
