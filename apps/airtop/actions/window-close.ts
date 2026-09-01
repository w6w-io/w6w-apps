import type { ActionDefinition } from "@w6w/types";
import { AirtopClient } from "../lib/client.ts";
import { sessionIdParam, windowIdParam } from "../lib/params.ts";

/** `DELETE /v1/sessions/{sessionId}/windows/{windowId}` — close a browser window. */
interface Input {
  sessionId: string;
  windowId: string;
}

const windowClose: ActionDefinition<Input> = {
  key: "window-close",
  type: "perform",
  resource: "window",
  title: "Close Window",
  description: "Close a browser window in a session.",
  idempotent: true,
  params: [sessionIdParam, windowIdParam],
  output: [{ key: "success", type: "boolean", label: "Success" }],

  async execute(input, ctx) {
    const result = await new AirtopClient(ctx).data<{ success?: boolean }>(
      `/v1/sessions/${encodeURIComponent(input.sessionId)}/windows/${
        encodeURIComponent(input.windowId)
      }`,
      { method: "DELETE" },
    );
    return { success: result?.success ?? true };
  },
};

export default windowClose;
