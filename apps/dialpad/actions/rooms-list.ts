import type { ActionDefinition } from "@w6w/types";
import { DialpadClient, type DialpadPage } from "../lib/client.ts";
import { cursorParam, officeIdParam } from "../lib/params.ts";

/** `GET /api/v2/rooms` — list rooms in the company, optionally filtered to one office. */
interface Input {
  cursor?: string;
  officeId?: string;
}

const roomsList: ActionDefinition<Input> = {
  key: "rooms-list",
  type: "search",
  resource: "room",
  title: "List Rooms",
  description: "List rooms in the company, optionally filtering by office.",
  params: [cursorParam, officeIdParam],
  output: [
    { key: "cursor", type: "string", label: "Next page cursor (null on the last page)" },
    { key: "items", type: "array", label: "Rooms on this page" },
  ],

  execute(input, ctx) {
    return new DialpadClient(ctx).json<DialpadPage<unknown>>("/rooms", {
      query: { cursor: input.cursor, office_id: input.officeId },
    });
  },
};

export default roomsList;
