import type { ActionDefinition } from "@w6w/types";
import { CannyClient } from "../lib/client.ts";

/**
 * `POST /v1/boards/list` — every board in the workspace.
 *
 * Takes no arguments beyond the API key: unlike most of Canny's list
 * endpoints there is no pagination here — Canny's docs give it a flat
 * `{"boards": [...]}` response with no `hasMore`/cursor, and workspaces
 * typically have single-digit board counts.
 */
const boardList: ActionDefinition<Record<string, never>> = {
  key: "board-list",
  type: "search",
  resource: "board",
  title: "List Boards",
  description: "List every board in the workspace.",
  output: [{ key: "boards", type: "array", label: "Boards" }],
  sample: { boards: [] },

  execute(_input, ctx) {
    return new CannyClient(ctx).post<{ boards: unknown[] }>("/boards/list");
  },
};

export default boardList;
