import type { ActionDefinition } from "@w6w/types";
import { gqlEnum, gqlInput, PIPE_FIELDS, PipefyClient } from "../lib/client.ts";

interface Input {
  id: string;
  name?: string;
  public?: boolean;
  anyoneCanCreateCard?: boolean;
  color?: string;
}

/**
 * `updatePipe(input: {id, name, public, anyone_can_create_card, color}) {
 * pipe { ... } }` — `name`/`public`/`anyone_can_create_card`/`color` are
 * exactly Pipefy's own reference example's arguments. `color` is confirmed
 * as an unquoted GraphQL enum identifier (`color: green`) both there and in
 * Pipefy's own Terraform provider (`Colors` enum type in
 * `internal/pipefy/pipe.go`'s mutation signature) — passed through
 * `gqlEnum` here so it's emitted unquoted rather than as a string literal.
 */
const buildQuery = (id: string, fields: Record<string, unknown>) =>
  `mutation { updatePipe(input: ${gqlInput({ id, ...fields })}) { pipe { ${PIPE_FIELDS} } } }`;

const pipeUpdate: ActionDefinition<Input> = {
  key: "pipe-update",
  type: "perform",
  resource: "pipe",
  title: "Update Pipe",
  description: "Update a pipe's name, visibility, card-creation policy, or color.",
  idempotent: true,
  params: [
    { key: "id", label: "Pipe ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string" },
    { key: "public", label: "Public", type: "boolean" },
    { key: "anyoneCanCreateCard", label: "Anyone can create a card", type: "boolean" },
    {
      key: "color",
      label: "Color",
      type: "string",
      hint: "One of Pipefy's pipe colors, e.g. green, blue, red, yellow, lime, purple.",
    },
  ],
  output: [{ key: "pipe", type: "object", label: "The updated pipe" }],

  async execute(input, ctx) {
    const data = await new PipefyClient(ctx).send<{ updatePipe: { pipe: unknown } }>(
      buildQuery(input.id, {
        name: input.name,
        public: input.public,
        anyone_can_create_card: input.anyoneCanCreateCard,
        color: gqlEnum(input.color),
      }),
    );
    return data.updatePipe.pipe;
  },
};

export default pipeUpdate;
