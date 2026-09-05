import type { ActionDefinition } from "@w6w/types";
import { gqlInput, PHASE_FIELDS, PipefyClient } from "../lib/client.ts";

interface Input {
  pipeId: string;
  name: string;
  done?: boolean;
  description?: string;
}

/**
 * `createPhase(input: {pipe_id, name, done, description}) { phase { ... } }`
 * — `pipe_id`/`name` from Pipefy's own reference example; `done`/
 * `description` confirmed additionally by Pipefy's own Terraform provider
 * (`internal/pipefy/phase.go`'s `createPhaseMutation`).
 */
const buildQuery = (fields: Record<string, unknown>) =>
  `mutation { createPhase(input: ${gqlInput(fields)}) { phase { ${PHASE_FIELDS} } } }`;

const phaseCreate: ActionDefinition<Input> = {
  key: "phase-create",
  type: "perform",
  resource: "phase",
  title: "Create Phase",
  description: "Add a phase to a pipe.",
  idempotent: false,
  params: [
    { key: "pipeId", label: "Pipe ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string", required: true },
    { key: "done", label: "Is a 'done' phase", type: "boolean" },
    { key: "description", label: "Description", type: "text" },
  ],
  output: [{ key: "phase", type: "object", label: "The created phase" }],

  async execute(input, ctx) {
    const data = await new PipefyClient(ctx).send<{ createPhase: { phase: unknown } }>(
      buildQuery({
        pipe_id: input.pipeId,
        name: input.name,
        done: input.done,
        description: input.description,
      }),
    );
    return data.createPhase.phase;
  },
};

export default phaseCreate;
