import type { ActionDefinition } from "@w6w/types";
import { unwrapStaffAddResult, ZohoBookingsClient } from "../lib/client.ts";

interface Input {
  name: string;
  email: string;
  gender?: string;
  role?: "Admin" | "Manager" | "Staff";
  dob?: string;
  additionalInfo?: string;
  phone?: string;
  designation?: string;
  assignedServices?: string;
}

interface Output {
  id?: string;
  name?: string;
  email?: string;
  status: string;
}

/**
 * `POST /bookings/v1/json/addstaff` — admin/super-admin only. Unlike every
 * other write in this app, the whole payload travels as ONE form field
 * (`staffMap`) whose value is a JSON string wrapping a `data` array — the
 * vendor doc's own sample always sends a single-item array, and this action
 * follows that shape rather than exposing bulk add (the doc's own "Possible
 * Errors" section caps a single call at 50 staff, a bulk case this app does
 * not attempt).
 *
 * The response is a bare `{"response": [...]}` array with no
 * `returnvalue`/`status` wrapper — see `lib/client.ts` module docs — and a
 * per-item `status` that is `"success"` or an error description such as
 * `"Staff already exists"`, even on a 2xx. `unwrapStaffAddResult` turns the
 * latter into a thrown error.
 */
const staffAdd: ActionDefinition<Input, Output> = {
  key: "staff-add",
  type: "perform",
  resource: "staff",
  title: "Add Staff",
  description: "Add a staff member to this Zoho Bookings account. Requires admin access.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "email", label: "Email", type: "string", required: true },
    { key: "gender", label: "Gender", type: "string" },
    {
      key: "role",
      label: "Role",
      type: "select",
      options: [
        { value: "Admin", label: "Admin" },
        { value: "Manager", label: "Manager" },
        { value: "Staff", label: "Staff" },
      ],
    },
    {
      key: "dob",
      label: "Date of birth",
      type: "string",
      hint: "Format: dd-MMM-yyyy HH:mm:ss, e.g. 12-Aug-1999 00:00:00.",
    },
    { key: "additionalInfo", label: "Additional info", type: "text" },
    { key: "phone", label: "Phone", type: "string" },
    { key: "designation", label: "Designation", type: "string" },
    {
      key: "assignedServices",
      label: "Assigned service IDs",
      type: "string",
      hint: "Comma-separated service ids.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "New staff ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "email", type: "string", label: "Email" },
    { key: "status", type: "string", label: "Result" },
  ],

  async execute(input, ctx) {
    const assignedServices = (input.assignedServices ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const staffMap = {
      data: [
        {
          name: input.name,
          email: input.email,
          gender: input.gender,
          role: input.role,
          dob: input.dob,
          additional_info: input.additionalInfo,
          phone: input.phone,
          designation: input.designation,
          ...(assignedServices.length ? { assigned_services: assignedServices } : {}),
        },
      ],
    };

    const form = new FormData();
    form.append("staffMap", JSON.stringify(staffMap));

    const body = await new ZohoBookingsClient(ctx).request<{
      response?: Array<{ id?: string; name?: string; email?: string; status: string }>;
    }>("/addstaff", { method: "POST", form });
    return unwrapStaffAddResult(body, "POST", "/bookings/v1/json/addstaff");
  },
};

export default staffAdd;
