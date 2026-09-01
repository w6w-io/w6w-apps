import type { ActionDefinition } from "@w6w/types";
import { AirtopClient } from "../lib/client.ts";
import { sessionIdParam, sessionOutput } from "../lib/params.ts";

/** `GET /v1/sessions/{id}` — read a session's current state and connection info. */
interface Input {
  sessionId: string;
}

const sessionGet: ActionDefinition<Input> = {
  key: "session-get",
  type: "read",
  resource: "session",
  title: "Get Session",
  description: "Get a session's current status and connection details.",
  params: [sessionIdParam],
  output: sessionOutput,

  execute(input, ctx) {
    return new AirtopClient(ctx).data(`/v1/sessions/${encodeURIComponent(input.sessionId)}`);
  },
};

export default sessionGet;
