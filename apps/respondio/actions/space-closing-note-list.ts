import type { ActionDefinition } from "@w6w/types";
import { compact, RespondioClient } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

/**
 * `GET /space/closing_notes` — `SpaceClient.listClosingNotes` in the official
 * SDK. The categories a caller may pass to `conversation-update-status` when
 * closing a conversation.
 */
interface Input {
  limit?: number;
  cursorId?: number;
}

const spaceClosingNoteList: ActionDefinition<Input> = {
  key: "space-closing-note-list",
  type: "read",
  resource: "space",
  title: "List Closing Notes",
  description: "List this workspace's conversation-closing-note categories.",
  params: [...paginationParams()],
  output: [
    { key: "items", type: "array", label: "Closing note categories" },
    { key: "pagination", type: "object", label: "Pagination cursor" },
  ],

  execute(input, ctx) {
    return new RespondioClient(ctx).get(
      "/space/closing_notes",
      compact({ limit: input.limit, cursorId: input.cursorId }),
    );
  },
};

export default spaceClosingNoteList;
