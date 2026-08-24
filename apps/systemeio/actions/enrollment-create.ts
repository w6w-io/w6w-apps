import type { ActionDefinition } from "@w6w/types";
import { compact, SystemeClient } from "../lib/client.ts";
import { enrollmentAccessTypeOptions } from "../lib/params.ts";

interface Input {
  courseId: number;
  contactId: number;
  accessType: string;
  modules?: number[];
}

/**
 * `POST /api/school/courses/{courseId}/enrollments`.
 *
 * `modules` (a list of module ids) is required by the vendor only when
 * `accessType` is `partial_access` or `partial_dripping_access` — the schema
 * enforces that pairing server-side, so it stays an always-optional param
 * here rather than a client-side conditional requirement that could drift
 * from the vendor's own rule.
 */
const enrollmentCreate: ActionDefinition<Input> = {
  key: "enrollment-create",
  type: "perform",
  resource: "enrollment",
  title: "Enroll Contact in Course",
  description: "Create an Enrollment resource, giving a Contact access to a Course.",
  idempotent: false,
  params: [
    {
      key: "courseId",
      label: "Course ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
    },
    {
      key: "contactId",
      label: "Contact ID",
      type: "number",
      required: true,
      validation: { integer: true },
    },
    {
      key: "accessType",
      label: "Access type",
      type: "select",
      required: true,
      options: enrollmentAccessTypeOptions,
    },
    {
      key: "modules",
      label: "Module IDs",
      type: "array",
      item: { type: "number" },
      hint: "Required when Access type is 'Partial access' or 'Partial dripping access'.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Enrollment ID" },
    { key: "contact", type: "object", label: "Contact" },
    { key: "course", type: "object", label: "Course" },
    { key: "accessType", type: "string", label: "Access type" },
    { key: "active", type: "boolean", label: "Active" },
  ],

  async execute(input, ctx) {
    return await new SystemeClient(ctx).post(
      `/api/school/courses/${input.courseId}/enrollments`,
      compact({ contactId: input.contactId, accessType: input.accessType, modules: input.modules }),
    );
  },
};

export default enrollmentCreate;
