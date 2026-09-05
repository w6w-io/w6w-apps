import type { ActionDefinition } from "@w6w/types";
import { type JsonApiCollection, PlanningCenterClient } from "../lib/client.ts";

interface Input {
  eventId?: string;
  createdAtGte?: string;
  createdAtLte?: string;
  perPage?: number;
  offset?: number;
}

interface CheckInAttributes {
  first_name?: string;
  last_name?: string;
  kind?: string;
  number?: number;
  security_code?: string;
  checked_out_at?: string;
  created_at?: string;
  one_time_guest?: boolean;
}

interface Output {
  checkIns: Array<{
    id: string;
    firstName?: string;
    lastName?: string;
    kind?: string;
    number?: number;
    securityCode?: string;
    checkedOutAt?: string;
    createdAt?: string;
    oneTimeGuest?: boolean;
    personId?: string;
  }>;
  totalCount?: number;
  nextOffset?: number;
}

/**
 * `GET /check-ins/v2/check_ins` — attendance records from the Check-Ins
 * module.
 *
 * Deliberately DOES NOT surface `emergency_contact_name`,
 * `emergency_contact_phone_number` or `medical_notes`, all three of which the
 * live Check-Ins OpenAPI document lists as real `CheckIn` attributes — most
 * often collected for children's check-in and stored per-visit, not just per
 * person. A workflow step's result is persisted in run history and routinely
 * echoed into logs and previews; returning a child's medical notes or a
 * parent's phone number into that surface by default is a materially
 * different privacy exposure than returning a name or a security code, so
 * this action leaves that trio out. It exists to answer "who checked in and
 * when", not to be the full attendance record.
 *
 * `security_code` is the pickup code printed on the check-in label, not a
 * credential.
 */
const listCheckIns: ActionDefinition<Input, Output> = {
  key: "list-check-ins",
  type: "search",
  title: "List Check-Ins",
  description: "List attendance check-in records, optionally filtered by event or date.",
  params: [
    { key: "eventId", label: "Event ID", type: "string" },
    {
      key: "createdAtGte",
      label: "Checked in on/after",
      type: "datetime",
      row: "range",
      hint: "ISO 8601 datetime.",
    },
    { key: "createdAtLte", label: "Checked in on/before", type: "datetime", row: "range" },
    { key: "perPage", label: "Per page", type: "number", default: 25, hint: "Maximum 100." },
    { key: "offset", label: "Offset", type: "number", default: 0 },
  ],
  output: [
    { key: "checkIns", type: "array", label: "Check-ins" },
    { key: "totalCount", type: "number", label: "Total count" },
    { key: "nextOffset", type: "number", label: "Next page offset" },
  ],

  async execute(input, ctx) {
    const client = new PlanningCenterClient(ctx);
    const body = await client.get<JsonApiCollection<CheckInAttributes>>("check-ins", "/check_ins", {
      where: {
        event_id: input.eventId,
        created_at: { gte: input.createdAtGte, lte: input.createdAtLte },
      },
      query: { per_page: input.perPage ?? 25, offset: input.offset ?? 0 },
    });

    return {
      checkIns: body.data.map((c) => ({
        id: c.id,
        firstName: c.attributes.first_name,
        lastName: c.attributes.last_name,
        kind: c.attributes.kind,
        number: c.attributes.number,
        securityCode: c.attributes.security_code,
        checkedOutAt: c.attributes.checked_out_at,
        createdAt: c.attributes.created_at,
        oneTimeGuest: c.attributes.one_time_guest,
        personId: (c.relationships?.person?.data as { id?: string } | undefined)?.id,
      })),
      totalCount: body.meta?.total_count,
      nextOffset: body.meta?.next?.offset,
    };
  },
};

export default listCheckIns;
