import type { ActionDefinition } from "@w6w/types";
import { DustClient } from "../lib/client.ts";

/**
 * `GET /assistant/agent_configurations` — verified against the vendor's
 * OpenAPI document ("List agents").
 *
 * `view` picks which slice of the workspace's agents comes back; the
 * document states the default differs by auth ("all" unauthenticated, "list"
 * authenticated) — since every call here IS authenticated, this action
 * defaults to `list` explicitly rather than relying on that server-side
 * default. `all_unrestricted` additionally requires an admin key, which this
 * action does not assume.
 */
interface Input {
  view?: string;
  withAuthors?: boolean;
}

interface Output {
  agentConfigurations: unknown[];
}

const agentList: ActionDefinition<Input, Output> = {
  key: "agent-list",
  type: "read",
  resource: "agent",
  title: "List Agents",
  description: "List the agent configurations (assistants) available in the workspace.",
  params: [
    {
      key: "view",
      label: "View",
      type: "select",
      default: "list",
      options: [
        { value: "list", label: "List — every active agent accessible to the caller" },
        { value: "all", label: "All — every non-private agent" },
        { value: "published", label: "Published — agents with published scope" },
        { value: "global", label: "Global — the workspace's built-in agents" },
        { value: "favorites", label: "Favorites" },
        {
          value: "all_unrestricted",
          label: "All (unrestricted) — every active agent; requires an admin key",
        },
      ],
    },
    {
      key: "withAuthors",
      label: "Include recent authors",
      type: "boolean",
      default: false,
      advanced: true,
    },
  ],
  output: [{ key: "agentConfigurations", type: "array", label: "Agent configurations" }],

  execute(input, ctx) {
    ctx.log("info", "listing Dust agents", { view: input.view });
    return new DustClient(ctx).json<Output>("/assistant/agent_configurations", {
      query: {
        view: input.view,
        withAuthors: input.withAuthors === undefined ? undefined : String(input.withAuthors),
      },
    });
  },
};

export default agentList;
