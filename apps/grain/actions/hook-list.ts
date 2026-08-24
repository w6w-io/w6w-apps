import type { ActionDefinition } from "@w6w/types";
import { GrainClient } from "../lib/client.ts";
import { hookStateOptions, hookTypeOptions } from "../lib/params.ts";

interface Input {
  filterHookType?: string;
  filterState?: string;
}

interface Output {
  hooks: unknown[];
}

/**
 * `POST /_/public-api/v2/hooks` — every hook registered on this credential,
 * optionally filtered by type or enabled state. No pagination is documented
 * — Grain returns the full list in one call.
 */
const hookList: ActionDefinition<Input, Output> = {
  key: "hook-list",
  type: "search",
  resource: "hook",
  title: "List Hooks",
  description: "List registered hooks, optionally filtered by type or state.",
  params: [
    { key: "filterHookType", label: "Hook Type", type: "select", options: hookTypeOptions },
    { key: "filterState", label: "State", type: "select", options: hookStateOptions },
  ],
  output: [
    {
      key: "hooks",
      type: "array",
      label: "Hooks (id, enabled, hook_url, hook_type, include, inserted_at)",
    },
  ],

  async execute(input, ctx) {
    const filter: Record<string, unknown> = {};
    if (input.filterHookType) filter.hook_type = input.filterHookType;
    if (input.filterState) filter.state = input.filterState;

    const body: Record<string, unknown> = {};
    if (Object.keys(filter).length > 0) body.filter = filter;

    const result = await new GrainClient(ctx).request<{ hooks?: unknown[] }>("/v2/hooks", {
      method: "POST",
      body,
    });
    return { hooks: result?.hooks ?? [] };
  },
};

export default hookList;
