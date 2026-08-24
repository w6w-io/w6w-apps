import type { ActionDefinition } from "@w6w/types";
import { BrowseAiClient } from "../lib/client.ts";
import { robotIdParam } from "../lib/params.ts";

/**
 * `GET /v2/robots/{robotId}` — a single robot's definition, including its
 * `inputParameters` schema.
 *
 * `inputParameters` is the one thing worth running this before `task-run`:
 * it lists exactly which override keys the robot accepts (its origin URL
 * field, any limit/skip pair, select-style filters, …), each with its own
 * `name`/`type`/`defaultValue` — the shape `task-run`'s `inputParameters` json
 * param has to match to have any effect at all.
 */
interface Input {
  robotId: string;
}

interface Output {
  id: string;
  name?: string;
  createdAt: number;
  inputParameters?: unknown;
}

const robotGet: ActionDefinition<Input, Output> = {
  key: "robot-get",
  type: "read",
  resource: "robot",
  title: "Get Robot",
  description: "Retrieve a single robot by ID, including the input parameters it accepts.",
  params: [robotIdParam],
  output: [
    { key: "id", type: "string", label: "Robot ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "createdAt", type: "number", label: "Created at" },
    { key: "inputParameters", type: "array", label: "Input parameters" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "fetching robot", { robotId: input.robotId });
    const body = await new BrowseAiClient(ctx).request<{ robot: Output }>(
      `/robots/${encodeURIComponent(input.robotId)}`,
    );
    return body.robot;
  },
};

export default robotGet;
