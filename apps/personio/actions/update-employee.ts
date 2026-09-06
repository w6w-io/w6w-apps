import type { ActionDefinition } from "@w6w/types";
import { compact, requestJson } from "../lib/client.ts";

/**
 * `PATCH /company/employees/{employee_id}` — updates only the fields provided. Personio's
 * reference is explicit that the email cannot be updated through this endpoint, so it is
 * not a param here.
 */
interface Input {
  employeeId: number;
  firstName?: string;
  lastName?: string;
  preferredName?: string;
  gender?: string;
  position?: string;
  subcompany?: string;
  department?: string;
  office?: string;
  hireDate?: string;
  weeklyWorkingHours?: number;
  status?: string;
  supervisorId?: number;
}

interface UpdateResponse {
  data?: { message?: string };
}

const updateEmployee: ActionDefinition<Input, unknown> = {
  key: "update-employee",
  type: "perform",
  resource: "employee",
  title: "Update Employee",
  description: "Update an existing employee's fields. The email address cannot be changed " +
    "through this endpoint.",
  idempotent: true,
  params: [
    { key: "employeeId", label: "Employee ID", type: "number", required: true },
    { key: "firstName", label: "First name", type: "string", row: "name" },
    { key: "lastName", label: "Last name", type: "string", row: "name" },
    { key: "preferredName", label: "Preferred name", type: "string", advanced: true },
    {
      key: "gender",
      label: "Gender",
      type: "select",
      options: [
        { value: "male", label: "Male" },
        { value: "female", label: "Female" },
        { value: "diverse", label: "Diverse" },
      ],
      advanced: true,
    },
    { key: "position", label: "Position", type: "string", advanced: true },
    { key: "subcompany", label: "Subcompany", type: "string", advanced: true },
    { key: "department", label: "Department", type: "string", advanced: true },
    { key: "office", label: "Office", type: "string", advanced: true },
    { key: "hireDate", label: "Hire date", type: "date", advanced: true },
    { key: "weeklyWorkingHours", label: "Weekly working hours", type: "number", advanced: true },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "onboarding", label: "Onboarding" },
        { value: "active", label: "Active" },
        { value: "leave", label: "Leave" },
        { value: "inactive", label: "Inactive" },
      ],
      advanced: true,
    },
    {
      key: "supervisorId",
      label: "Supervisor employee ID",
      type: "number",
      advanced: true,
      hint: "Send blank to unset the supervisor.",
    },
  ],
  output: [
    { key: "message", type: "string", label: "Message" },
  ],

  async execute(input, ctx) {
    const employee = compact({
      first_name: input.firstName,
      last_name: input.lastName,
      preferred_name: input.preferredName,
      gender: input.gender,
      position: input.position,
      subcompany: input.subcompany,
      department: input.department,
      office: input.office,
      hire_date: input.hireDate,
      weekly_working_hours: input.weeklyWorkingHours,
      status: input.status,
      supervisor_id: input.supervisorId,
    });
    const res = await requestJson<UpdateResponse>(
      ctx,
      `/company/employees/${encodeURIComponent(String(input.employeeId))}`,
      { method: "PATCH", body: { employee } },
    );
    return { message: res.data?.message };
  },
};

export default updateEmployee;
