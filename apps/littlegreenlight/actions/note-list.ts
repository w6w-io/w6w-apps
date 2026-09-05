import type { ActionDefinition } from "@w6w/types";
import { LglClient } from "../lib/client.ts";
import { envelopeOutput, paginationParams, paginationQuery } from "../lib/params.ts";

interface Input {
  constituent_id: number;
  limit?: number;
  offset?: number;
}

/** `GET /api/v1/constituents/{constituent_id}/notes.json`. */
const noteList: ActionDefinition<Input> = {
  key: "note-list",
  type: "read",
  resource: "note",
  title: "List Notes for Constituent",
  description: "List notes recorded against a single constituent.",
  params: [
    {
      key: "constituent_id",
      label: "Constituent ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
    },
    ...paginationParams(),
  ],
  output: envelopeOutput,

  async execute(input, ctx) {
    return await new LglClient(ctx).list(`/constituents/${input.constituent_id}/notes`, {
      query: paginationQuery(input),
    });
  },
};

export default noteList;
