import type { ActionDefinition } from "@w6w/types";
import { BrexClient, type BrexTitle } from "../lib/client.ts";
import { idempotencyKeyParam } from "../lib/params.ts";

/**
 * `POST /v2/titles` — create a title.
 *
 * `name` is the entire request body: unlike locations and departments, a title
 * has no `description` field at all. A retry creates a second title unless the
 * caller supplies Brex's optional `Idempotency-Key` header, so the action is
 * declared non-idempotent and forwards a key only when one is given.
 */
interface Input {
  name: string;
  idempotencyKey?: string;
}

const titleCreate: ActionDefinition<Input> = {
  key: "title-create",
  type: "perform",
  resource: "title",
  title: "Create Title",
  description: "Create a Brex title. Brex's title resource carries a name and nothing else.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    idempotencyKeyParam,
  ],
  output: [
    { key: "id", type: "string", label: "Title id" },
    { key: "name", type: "string", label: "Name" },
  ],

  execute(input, ctx) {
    return new BrexClient(ctx).json<BrexTitle>("/titles", {
      method: "POST",
      idempotencyKey: input.idempotencyKey,
      body: { name: input.name },
    });
  },
};

export default titleCreate;
