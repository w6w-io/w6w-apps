import type { ActionDefinition } from "@w6w/types";
import { containerIdParam } from "../lib/params.ts";
import { PhantomBusterClient } from "../lib/client.ts";

/** `GET /containers/fetch` — one container by id. */
interface Input {
  id: string;
  withResultObject?: boolean;
  withOutput?: boolean;
  withRuntimeEvents?: boolean;
  withNewerAndOlderContainerId?: boolean;
}

const containerGet: ActionDefinition<Input> = {
  key: "container-get",
  type: "read",
  title: "Get Container",
  description: "Get one container (agent run) by id.",
  params: [
    containerIdParam,
    { key: "withResultObject", label: "Include result object", type: "boolean" },
    { key: "withOutput", label: "Include console output", type: "boolean" },
    { key: "withRuntimeEvents", label: "Include runtime events", type: "boolean" },
    {
      key: "withNewerAndOlderContainerId",
      label: "Include adjacent container IDs",
      type: "boolean",
      hint: "Include the ids of the containers immediately newer and older than this one.",
    },
  ],
  output: [{ key: "container", type: "object", label: "Container" }],

  async execute(input, ctx) {
    const client = new PhantomBusterClient(ctx);
    const container = await client.get("/containers/fetch", {
      query: {
        id: input.id,
        withResultObject: input.withResultObject ? "true" : undefined,
        withOutput: input.withOutput ? "true" : undefined,
        withRuntimeEvents: input.withRuntimeEvents ? "true" : undefined,
        withNewerAndOlderContainerId: input.withNewerAndOlderContainerId ? "true" : undefined,
      },
    });
    return { container };
  },
};

export default containerGet;
