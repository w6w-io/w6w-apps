import type { ActionDefinition } from "@w6w/types";
import { compact, OpusClipClient } from "../lib/client.ts";

/**
 * `GET /api/collections` — list the account's collections, or the collections
 * that contain a given clip.
 */
interface Input {
  mode: "mine" | "byContent";
  contentId?: string;
}

interface CollectionListData {
  list: unknown[];
  total: number;
  next?: string | number | null;
  limit?: number;
}

const collectionList: ActionDefinition<Input> = {
  key: "collection-list",
  type: "read",
  resource: "collection",
  title: "List Collections",
  description: "List your account's collections, or the collections containing a given clip.",
  params: [
    {
      key: "mode",
      label: "Find by",
      type: "select",
      required: true,
      default: "mine",
      options: [
        { value: "mine", label: "All my collections" },
        { value: "byContent", label: "Collections containing a clip" },
      ],
    },
    {
      key: "contentId",
      label: "Clip ID",
      type: "string",
      showIf: { "==": [{ var: "mode" }, "byContent"] },
      hint: "Composite id, {projectId}.{curationId} — e.g. P0000000demo.CUexample2.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Collections" },
    { key: "total", type: "number", label: "Total matching collections" },
  ],

  async execute(input, ctx) {
    const query = compact({
      q: input.mode === "byContent" ? "findByContentId" : "mine",
      contentId: input.mode === "byContent" ? input.contentId : undefined,
    });
    const data = await new OpusClipClient(ctx).data<CollectionListData>("/api/collections", {
      query,
    });
    return { items: data?.list ?? [], total: data?.total ?? 0 };
  },
};

export default collectionList;
