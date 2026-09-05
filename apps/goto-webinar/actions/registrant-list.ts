import type { ActionDefinition } from "@w6w/types";
import { GotoWebinarClient, resolveOrganizerKey } from "../lib/client.ts";

/**
 * `GET /organizers/{organizerKey}/webinars/{webinarKey}/registrants` — list registrants.
 *
 * Page size here is `limit` — NOT `size`, which is what `webinar-list`'s endpoint uses for the
 * identical concept. See `lib/client.ts`'s module doc for the full inconsistency.
 */
interface Input {
  organizerKey?: string;
  webinarKey: string;
  page?: number;
  limit?: number;
}

const registrantList: ActionDefinition<Input> = {
  key: "registrant-list",
  type: "search",
  resource: "registrant",
  title: "List Registrants",
  description: "List a webinar's registrants.",
  params: [
    {
      key: "organizerKey",
      label: "Organizer key",
      type: "string",
      hint: "Defaults to the key captured when this connection was made.",
    },
    { key: "webinarKey", label: "Webinar key", type: "string", required: true },
    { key: "page", label: "Page", type: "number", default: 0, hint: "Zero-indexed." },
    {
      key: "limit",
      label: "Page size",
      type: "number",
      hint: 'Called "limit" here, "size" on List Webinars — GoTo spells the same concept ' +
        "differently per endpoint.",
    },
  ],
  output: [{ key: "registrants", type: "array", label: "Registrants" }],

  async execute(input, ctx) {
    const organizerKey = resolveOrganizerKey(ctx.connection, input.organizerKey);
    const body = await new GotoWebinarClient(ctx).request<unknown[]>(
      `/organizers/${organizerKey}/webinars/${input.webinarKey}/registrants`,
      { query: { page: input.page, limit: input.limit } },
    );
    return { registrants: body ?? [] };
  },
};

export default registrantList;
