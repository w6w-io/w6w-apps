import type { ActionDefinition } from "@w6w/types";
import { gqlLiteral, PIPE_FIELDS, PipefyClient } from "../lib/client.ts";

interface Input {
  id: string;
}

/**
 * `{ pipe(id) { ...PIPE_FIELDS, organization{id}, phases{id name},
 * start_form_fields{id label}, labels{id name color} } }` — Pipefy's own
 * "Objects Within Pipe" example, restricted to the sub-selections that
 * example itself confirms (its `members`/`webhooks` sub-selections are left
 * out of the default shape here but reachable via `graphql-query`).
 */
const buildQuery = (id: string) =>
  `{ pipe(id: ${gqlLiteral(id)}) {
    ${PIPE_FIELDS}
    organization { id }
    phases { id name }
    start_form_fields { id label }
    labels { id name color }
  } }`;

const pipeGet: ActionDefinition<Input> = {
  key: "pipe-get",
  type: "read",
  resource: "pipe",
  title: "Get Pipe",
  description: "Get a pipe by ID, including its phases, start-form fields and labels.",
  params: [
    { key: "id", label: "Pipe ID", type: "string", required: true },
  ],
  output: [{ key: "pipe", type: "object", label: "The pipe" }],

  async execute(input, ctx) {
    const data = await new PipefyClient(ctx).send<{ pipe: unknown }>(buildQuery(input.id));
    return data.pipe;
  },
};

export default pipeGet;
