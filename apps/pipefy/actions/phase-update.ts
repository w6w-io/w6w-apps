import type { ActionDefinition } from "@w6w/types";
import { gqlEnum, gqlInput, PHASE_FIELDS, PipefyClient } from "../lib/client.ts";

interface Input {
  id: string;
  name?: string;
  color?: string;
  done?: boolean;
  description?: string;
}

/**
 * `updatePhase(input: {id, name, color, done, description}) { phase { ... }
 * }` — `id`/`name`/`color` from Pipefy's own reference example (`color` is
 * an unquoted enum identifier there, same as `updatePipe`'s); `done`/
 * `description` confirmed additionally by Pipefy's own Terraform provider
 * (`internal/pipefy/phase.go`'s `updatePhaseMutation`).
 */
const buildQuery = (fields: Record<string, unknown>) =>
  `mutation { updatePhase(input: ${gqlInput(fields)}) { phase { ${PHASE_FIELDS} } } }`;

const phaseUpdate: ActionDefinition<Input> = {
  key: "phase-update",
  type: "perform",
  resource: "phase",
  title: "Update Phase",
  description: "Rename a phase or change its color, 'done' flag, or description.",
  idempotent: true,
  params: [
    { key: "id", label: "Phase ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string" },
    {
      key: "color",
      label: "Color",
      type: "string",
      hint: "One of Pipefy's phase colors, e.g. green, blue, red, yellow, lime, purple.",
    },
    { key: "done", label: "Is a 'done' phase", type: "boolean" },
    { key: "description", label: "Description", type: "text" },
  ],
  output: [{ key: "phase", type: "object", label: "The updated phase" }],

  async execute(input, ctx) {
    const data = await new PipefyClient(ctx).send<{ updatePhase: { phase: unknown } }>(
      buildQuery({
        id: input.id,
        name: input.name,
        color: gqlEnum(input.color),
        done: input.done,
        description: input.description,
      }),
    );
    return data.updatePhase.phase;
  },
};

export default phaseUpdate;
