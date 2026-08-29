import type { ActionDefinition } from "@w6w/types";
import { compact, SalesloftClient } from "../lib/client.ts";

interface Input {
  name?: string;
  teamCadence?: boolean;
  archived?: boolean;
  perPage?: number;
  page?: number;
}

/** GET /v2/cadences — list/filter cadences (Salesloft's sequences). */
const cadenceList: ActionDefinition<Input> = {
  key: "cadence-list",
  type: "read",
  resource: "cadence",
  title: "List Cadences",
  description: "List and filter cadences.",
  params: [
    { key: "name", label: "Name", type: "string" },
    { key: "teamCadence", label: "Team cadences only", type: "boolean" },
    {
      key: "archived",
      label: "Archived",
      type: "boolean",
      hint: "Omit to include both archived and active cadences.",
    },
    { key: "perPage", label: "Per page", type: "number", default: 25, hint: "1–100." },
    { key: "page", label: "Page", type: "number", default: 1 },
  ],
  output: [
    { key: "data", type: "array", label: "Cadences" },
    { key: "metadata", type: "object", label: "Paging metadata" },
  ],

  async execute(input, ctx) {
    const client = new SalesloftClient(ctx);
    return await client.request("/cadences", {
      query: compact({
        name: input.name,
        team_cadence: input.teamCadence,
        archived: input.archived,
        per_page: input.perPage,
        page: input.page,
      }),
    });
  },
};

export default cadenceList;
