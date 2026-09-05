import type { ActionDefinition } from "@w6w/types";
import { compact, LawmaticsClient, type LawmaticsItemEnvelope } from "../lib/client.ts";

interface Input {
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  caseTitle?: string;
  practiceAreaId?: number;
  subStatusId?: number;
  companyName?: string;
}

/**
 * `POST /v1/prospects` — create a Matter (intake). Confirmed against the
 * collection's "Create Matter" and "Create Matter From Company (By Name)"
 * examples: a bare `{first_name, last_name, email, phone,
 * practice_area_id, sub_status_id}` creates an individual Matter; adding
 * `company_name` creates (or matches) a Company and files the Matter under
 * it instead.
 */
const createMatter: ActionDefinition<Input> = {
  key: "create-matter",
  type: "perform",
  resource: "matter",
  title: "Create Matter",
  description:
    'Create a new Matter (Lawmatics\' "Prospect"). Set Company Name to file it under a company ' +
    "instead of an individual.",
  idempotent: false,
  params: [
    { key: "firstName", label: "First Name", type: "string", required: true },
    { key: "lastName", label: "Last Name", type: "string" },
    { key: "email", label: "Email", type: "string" },
    { key: "phone", label: "Phone", type: "string" },
    { key: "caseTitle", label: "Case Title", type: "string" },
    { key: "practiceAreaId", label: "Practice Area ID", type: "number", advanced: true },
    { key: "subStatusId", label: "Sub-Status ID", type: "number", advanced: true },
    {
      key: "companyName",
      label: "Company Name",
      type: "string",
      hint: "File this Matter under a Company (created if it doesn't already match by name).",
      advanced: true,
    },
  ],
  output: [
    { key: "id", type: "string", label: "Matter ID" },
    { key: "type", type: "string", label: "Resource type" },
    { key: "attributes", type: "object", label: "Matter attributes" },
  ],

  async execute(input, ctx) {
    const res = await new LawmaticsClient(ctx).request<LawmaticsItemEnvelope>("/prospects", {
      method: "POST",
      body: compact({
        first_name: input.firstName,
        last_name: input.lastName,
        email: input.email,
        phone: input.phone,
        case_title: input.caseTitle,
        practice_area_id: input.practiceAreaId,
        sub_status_id: input.subStatusId,
        company_name: input.companyName,
      }),
    });
    return res.data;
  },
};

export default createMatter;
