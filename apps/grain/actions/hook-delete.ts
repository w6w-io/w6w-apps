import type { ActionDefinition } from "@w6w/types";
import { GrainClient } from "../lib/client.ts";
import { successOutput } from "../lib/params.ts";

interface Input {
  hookId: string;
}

interface Output {
  success: boolean;
}

/** `DELETE /_/public-api/v2/hooks/:hook_id` — answers `{ "success": true }`. */
const hookDelete: ActionDefinition<Input, Output> = {
  key: "hook-delete",
  type: "perform",
  resource: "hook",
  title: "Delete Hook",
  description: "Delete a registered hook.",
  // Deleting an already-deleted hook is the same end state.
  idempotent: true,
  params: [
    {
      key: "hookId",
      label: "Hook ID",
      type: "string",
      required: true,
      hint: "UUID from Create Hook or List Hooks.",
    },
  ],
  output: successOutput,

  async execute(input, ctx) {
    const body = await new GrainClient(ctx).request<{ success?: boolean }>(
      `/v2/hooks/${encodeURIComponent(input.hookId)}`,
      { method: "DELETE" },
    );
    return { success: body?.success ?? false };
  },
};

export default hookDelete;
