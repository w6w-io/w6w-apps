import type { ActionDefinition } from "@w6w/types";
import { AirtopClient } from "../lib/client.ts";
import { sessionIdParam } from "../lib/params.ts";

/** `GET /v1/sessions/{sessionId}/windows` — list every window open in a session. */
interface Input {
  sessionId: string;
}

const windowList: ActionDefinition<Input> = {
  key: "window-list",
  type: "read",
  resource: "window",
  title: "List Windows",
  description: "List every browser window open in a session.",
  params: [sessionIdParam],
  output: [{ key: "windows", type: "array", label: "Windows" }],

  execute(input, ctx) {
    return new AirtopClient(ctx).data(
      `/v1/sessions/${encodeURIComponent(input.sessionId)}/windows`,
    );
  },
};

export default windowList;
