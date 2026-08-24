import type { ActionDefinition } from "@w6w/types";
import { SystemeClient } from "../lib/client.ts";

interface Input {
  id: string;
}

const enrollmentDelete: ActionDefinition<Input> = {
  key: "enrollment-delete",
  type: "perform",
  resource: "enrollment",
  title: "Delete Enrollment",
  description: "Remove an Enrollment resource, revoking the contact's course access.",
  idempotent: true,
  params: [
    { key: "id", label: "Enrollment ID", type: "string", required: true },
  ],
  output: [
    { key: "status", type: "number", label: "HTTP status" },
  ],

  async execute(input, ctx) {
    const status = await new SystemeClient(ctx).status(
      `/api/school/enrollments/${encodeURIComponent(input.id)}`,
    );
    return { status };
  },
};

export default enrollmentDelete;
