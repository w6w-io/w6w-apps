import type { ActionDefinition } from "@w6w/types";
import { DustClient } from "../lib/client.ts";

/**
 * `GET /spaces` — verified against the vendor's OpenAPI document ("List
 * available spaces"). A space (formerly "vault") scopes data sources and
 * apps; its `sId` is what Data Source actions and `spaceId` on Create
 * Conversation need.
 *
 * `kinds` defaults to the vendor's own default (`system,global,regular`) —
 * `project` spaces must be requested explicitly, per the parameter's own
 * description, so this action mirrors that rather than silently including
 * projects only some callers want listed.
 */
interface Input {
  kinds?: string | string[];
}

interface Output {
  spaces: unknown[];
}

const spaceList: ActionDefinition<Input, Output> = {
  key: "space-list",
  type: "read",
  resource: "space",
  title: "List Spaces",
  description: "List the spaces (projects) accessible in the workspace.",
  params: [
    {
      key: "kinds",
      label: "Kinds",
      type: "multiselect",
      options: [
        { value: "system", label: "System" },
        { value: "global", label: "Global — the workspace's default space" },
        { value: "regular", label: "Regular" },
        { value: "project", label: "Project" },
      ],
      hint: "Defaults to system, global and regular — projects must be requested explicitly.",
    },
  ],
  output: [{ key: "spaces", type: "array", label: "Spaces" }],

  execute(input, ctx) {
    const kinds = Array.isArray(input.kinds) ? input.kinds.join(",") : input.kinds;
    return new DustClient(ctx).json<Output>("/spaces", { query: { kinds } });
  },
};

export default spaceList;
