import type { ActionDefinition } from "@w6w/types";
import { PhantomBusterClient } from "../lib/client.ts";
import { containerStatusOptions, idParam } from "../lib/params.ts";

/**
 * `GET /agents/fetch-output` — the output of an agent's most recent
 * container: console output, status, progress and messages. Purpose-built for
 * incremental polling via `fromOutputPos`/`prevContainerId`/`prevStatus`.
 */
interface Input {
  id: string;
  fromOutputPos?: number;
  prevContainerId?: string;
  prevStatus?: string;
  prevRuntimeEventIndex?: number;
}

const agentFetchOutput: ActionDefinition<Input> = {
  key: "agent-fetch-output",
  type: "read",
  title: "Get Agent Output",
  description:
    "Get the console output, status, progress and messages of an agent's most recent container.",
  params: [
    idParam,
    {
      key: "fromOutputPos",
      label: "From output position",
      type: "number",
      validation: { integer: true, min: 0 },
      hint: "Return output starting from this position — pass the previous call's `outputPos` to " +
        "poll incrementally.",
    },
    {
      key: "prevContainerId",
      label: "Previous container ID",
      type: "string",
      hint: "Retrieve output from the container after this one.",
    },
    {
      key: "prevStatus",
      label: "Previously observed status",
      type: "select",
      options: containerStatusOptions,
    },
    {
      key: "prevRuntimeEventIndex",
      label: "Previous runtime event index",
      type: "number",
      validation: { integer: true, min: 0 },
      hint: "Return runtime events starting from this index.",
    },
  ],
  output: [
    { key: "containerId", type: "string", label: "Container ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "output", type: "string", label: "Console output" },
    { key: "outputPos", type: "number", label: "Output position" },
    { key: "progress", type: "number", label: "Progress" },
    { key: "isAgentRunning", type: "boolean", label: "Is agent running" },
  ],

  async execute(input, ctx) {
    const client = new PhantomBusterClient(ctx);
    return await client.get("/agents/fetch-output", {
      query: {
        id: input.id,
        fromOutputPos: input.fromOutputPos,
        prevContainerId: input.prevContainerId,
        prevStatus: input.prevStatus,
        prevRuntimeEventIndex: input.prevRuntimeEventIndex,
      },
    });
  },
};

export default agentFetchOutput;
