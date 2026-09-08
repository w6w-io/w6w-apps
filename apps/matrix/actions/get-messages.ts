import type { ActionDefinition } from "@w6w/types";
import { compact, MatrixClient, seg } from "../lib/client.ts";

interface Input {
  roomId: string;
  direction?: string;
  limit?: number;
  from?: string;
}

interface MatrixEvent {
  event_id?: string;
  type?: string;
  sender?: string;
  origin_server_ts?: number;
  content?: unknown;
}

interface Output {
  events: MatrixEvent[];
  start: string;
  end?: string;
}

/**
 * `GET /_matrix/client/v3/rooms/{roomId}/messages` — paginates a room's
 * timeline. `dir` defaults to `b` (reverse-chronological, i.e. "most recent
 * first") because that is what "read the recent messages in this room" means
 * for a workflow step; `f` is offered for walking history forward from a
 * `from` token.
 *
 * `chunk` includes both message and state events, per the spec ("a list of
 * message and state events for a room") — this action returns it unfiltered
 * rather than guessing which types a caller wants.
 */
const getMessages: ActionDefinition<Input, Output> = {
  key: "get-messages",
  type: "read",
  title: "Get Room Messages",
  description: "Read a page of a room's message history.",
  params: [
    {
      key: "roomId",
      label: "Room ID",
      type: "string",
      required: true,
      placeholder: "!abcdefg:matrix.org",
    },
    {
      key: "direction",
      label: "Direction",
      type: "select",
      default: "b",
      options: [
        { value: "b", label: "Backwards (newest first)" },
        { value: "f", label: "Forwards (oldest first)" },
      ],
    },
    { key: "limit", label: "Limit", type: "number", default: 10 },
    {
      key: "from",
      label: "Pagination Token",
      type: "string",
      hint: "An `end` token from a previous call, to continue paginating.",
      advanced: true,
    },
  ],
  output: [
    { key: "events", type: "array", label: "Events" },
    { key: "start", type: "string", label: "Start Token" },
    { key: "end", type: "string", label: "End Token" },
  ],

  async execute(input, ctx) {
    const client = new MatrixClient(ctx);
    const res = await client.request<{ chunk?: MatrixEvent[]; start?: string; end?: string }>(
      `/rooms/${seg(input.roomId)}/messages`,
      {
        query: compact({
          dir: input.direction ?? "b",
          limit: input.limit ?? 10,
          from: input.from,
        }),
      },
    );
    return { events: res.chunk ?? [], start: res.start ?? "", end: res.end };
  },
};

export default getMessages;
