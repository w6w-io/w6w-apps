import type { ActionDefinition } from "@w6w/types";
import { buildBody, LivestormClient, toPersonFields } from "../lib/client.ts";
import type { JsonApiSingleResponse, PersonField } from "../lib/client.ts";

/**
 * `POST /sessions/{id}/people/bulk` — register many people at once. Returns a `jobs` resource
 * immediately rather than the registered people; poll it with `job-get` (and `job-tasks-list`
 * for per-registrant results) rather than assuming success.
 */
interface Task {
  fields?: PersonField[] | Record<string, string>;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmTerm?: string;
  utmContent?: string;
  utmCampaign?: string;
}

interface Input {
  id: string;
  tasks: Task[];
}

const sessionPeopleBulkRegister: ActionDefinition<Input> = {
  key: "session-people-bulk-register",
  type: "perform",
  resource: "session",
  title: "Bulk-Register People for Session",
  description:
    "Register multiple participants for a session in one call. Creates an async job — poll " +
    "Get Job / List Job Tasks with the returned ID rather than assuming immediate success.",
  idempotent: false,
  params: [
    { key: "id", label: "Session ID", type: "string", required: true },
    {
      key: "tasks",
      label: "Registrants",
      type: "array",
      required: true,
      item: {
        type: "object",
        fields: [
          {
            key: "fields",
            label: "Fields",
            type: "array",
            item: {
              type: "object",
              fields: [
                { key: "id", label: "Attribute slug", type: "string", required: true },
                { key: "value", label: "Value", type: "string", required: true },
              ],
            },
            hint: 'e.g. {id: "email", value: "..."}, {id: "first_name", value: "..."}.',
          },
          { key: "referrer", label: "Referrer", type: "string" },
          { key: "utmSource", label: "utm_source", type: "string" },
          { key: "utmMedium", label: "utm_medium", type: "string" },
          { key: "utmTerm", label: "utm_term", type: "string" },
          { key: "utmContent", label: "utm_content", type: "string" },
          { key: "utmCampaign", label: "utm_campaign", type: "string" },
        ],
      },
    },
  ],
  output: [
    { key: "id", type: "string", label: "Job ID" },
    { key: "type", type: "string", label: "Type" },
    { key: "attributes", type: "object", label: "Attributes" },
  ],

  async execute(input, ctx) {
    const tasks = (input.tasks ?? []).map((t) => ({
      fields: toPersonFields(t.fields),
      referrer: t.referrer,
      utm_source: t.utmSource,
      utm_medium: t.utmMedium,
      utm_term: t.utmTerm,
      utm_content: t.utmContent,
      utm_campaign: t.utmCampaign,
    }));
    const body = buildBody("jobs", { tasks });
    const res = await new LivestormClient(ctx).request<JsonApiSingleResponse>(
      `/sessions/${encodeURIComponent(input.id)}/people/bulk`,
      { method: "POST", body },
    );
    return res.data;
  },
};

export default sessionPeopleBulkRegister;
