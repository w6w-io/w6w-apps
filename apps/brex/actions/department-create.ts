import type { ActionDefinition } from "@w6w/types";
import { BrexClient, type BrexNamedResource, compact } from "../lib/client.ts";
import { idempotencyKeyParam } from "../lib/params.ts";

/**
 * `POST /v2/departments` — create a department.
 *
 * `name` is required, `description` optional, and those two are the whole
 * request body. As with locations there is no documented uniqueness rule, so a
 * retry creates a second department unless the caller supplies Brex's optional
 * `Idempotency-Key` header — which this action forwards verbatim when present
 * and never invents.
 */
interface Input {
  name: string;
  description?: string;
  idempotencyKey?: string;
}

const departmentCreate: ActionDefinition<Input> = {
  key: "department-create",
  type: "perform",
  resource: "department",
  title: "Create Department",
  description: "Create a Brex department, optionally with a description.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "description", label: "Description", type: "string" },
    idempotencyKeyParam,
  ],
  output: [
    { key: "id", type: "string", label: "Department id" },
    { key: "name", type: "string", label: "Name" },
    { key: "description", type: "string", label: "Description" },
  ],

  execute(input, ctx) {
    return new BrexClient(ctx).json<BrexNamedResource>("/departments", {
      method: "POST",
      idempotencyKey: input.idempotencyKey,
      body: compact({ name: input.name, description: input.description }),
    });
  },
};

export default departmentCreate;
