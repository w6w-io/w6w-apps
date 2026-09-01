import type { ActionDefinition } from "@w6w/types";
import { ReplyClient } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

/**
 * `GET /v3/sequences` — browse the sequences you can work with, filterable by
 * status/owner/folder/name. Requires `sequences:read`.
 *
 * Reply calls this object a "sequence" throughout v3 — it is the same thing
 * v1/v2 called a "campaign".
 */
interface Input {
  top?: number;
  skip?: number;
  status?: string;
  ownerUserId?: number;
  folderId?: string;
  isArchived?: boolean;
  name?: string;
}

const sequenceList: ActionDefinition<Input> = {
  key: "sequence-list",
  type: "read",
  resource: "sequence",
  title: "List Sequences",
  description: "Browse sequences (Reply's outreach campaigns), filterable by status, owner, " +
    "folder, and name.",
  params: [
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "new", label: "New — not yet started" },
        { value: "active", label: "Active" },
        { value: "paused", label: "Paused" },
      ],
    },
    { key: "ownerUserId", label: "Owner user ID", type: "number" },
    { key: "folderId", label: "Folder ID", type: "string" },
    {
      key: "isArchived",
      label: "Archived only",
      type: "boolean",
      hint: "Leave unset to return both archived and non-archived sequences.",
    },
    {
      key: "name",
      label: "Name contains",
      type: "string",
      hint: "Case-insensitive, partial match.",
    },
    ...paginationParams(),
  ],
  output: [
    { key: "items", type: "array", label: "Sequences" },
    { key: "hasMore", type: "boolean", label: "Whether more sequences exist past this page" },
  ],

  execute(input, ctx) {
    return new ReplyClient(ctx).list("/sequences", {
      query: {
        top: input.top,
        skip: input.skip,
        status: input.status,
        ownerUserId: input.ownerUserId,
        folderId: input.folderId,
        isArchived: input.isArchived,
        name: input.name,
      },
    });
  },
};

export default sequenceList;
