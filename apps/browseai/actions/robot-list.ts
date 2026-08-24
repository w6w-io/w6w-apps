import type { ActionDefinition } from "@w6w/types";
import { BrowseAiClient } from "../lib/client.ts";

/**
 * `GET /v2/robots` — list every robot the team owns.
 *
 * Undocumented pagination: the OpenAPI operation declares no query parameters
 * at all, so this always returns the team's full robot list in one call. Fine
 * in practice — Browse AI's own dashboard shows robots as a flat, un-paginated
 * list too, and a team's robot count is small compared to its task volume.
 */
interface Output {
  totalCount: number;
  items: Array<{ id: string; name?: string; createdAt: number; inputParameters?: unknown }>;
}

const robotList: ActionDefinition<Record<string, never>, Output> = {
  key: "robot-list",
  type: "search",
  resource: "robot",
  title: "List Robots",
  description: "List every robot under the team that owns this connection.",
  params: [],
  output: [
    { key: "totalCount", type: "number", label: "Total robots" },
    { key: "items", type: "array", label: "Robots" },
  ],

  async execute(_input, ctx) {
    const body = await new BrowseAiClient(ctx).request<{ robots: Output }>("/robots");
    return body.robots;
  },
};

export default robotList;
