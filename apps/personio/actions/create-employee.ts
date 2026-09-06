import type { ActionDefinition } from "@w6w/types";
import { compact, requestJson } from "../lib/client.ts";

/**
 * `POST /company/employees` — creates an employee and, per Personio's own description,
 * responds with only `{ id, message }` on success (not the full created record — call
 * "Get Employee" afterwards for that). If `status` is left unset, Personio derives it
 * from `hireDate`: in the past -> `active`, in the future -> `onboarding`.
 */
interface Input {
  email: string;
  firstName: string;
  lastName: string;
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

interface CreateResponse {
  data?: { id?: number; message?: string };
}

const createEmployee: ActionDefinition<Input, unknown> = {
  key: "create-employee",
  type: "perform",
  resource: "employee",
  title: "Create Employee",
  description: "Create a new employee.",
  idempotent: false,
  params: [
    { key: "email", label: "Email", type: "string", required: true },
    { key: "firstName", label: "First name", type: "string", required: true, row: "name" },
    { key: "lastName", label: "Last name", type: "string", required: true, row: "name" },
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
    {
      key: "subcompany",
      label: "Subcompany",
      type: "string",
      advanced: true,
      hint: "Must already exist in Personio, or it is silently ignored.",
    },
    {
      key: "department",
      label: "Department",
      type: "string",
      advanced: true,
      hint: "Must already exist in Personio, or it is silently ignored.",
    },
    {
      key: "office",
      label: "Office",
      type: "string",
      advanced: true,
      hint: "Must already exist in Personio, or it is silently ignored.",
    },
    {
      key: "hireDate",
      label: "Hire date",
      type: "date",
      hint: "Format yyyy-mm-dd. Determines the default status when Status is left unset.",
    },
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
      hint: "Overrides the status Personio would otherwise derive from Hire date.",
    },
    {
      key: "supervisorId",
      label: "Supervisor employee ID",
      type: "number",
      advanced: true,
    },
  ],
  output: [
    { key: "id", type: "number", label: "Created employee ID" },
    { key: "message", type: "string", label: "Message" },
  ],

  async execute(input, ctx) {
    const employee = compact({
      email: input.email,
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
    const res = await requestJson<CreateResponse>(ctx, "/company/employees", {
      method: "POST",
      body: { employee },
    });
    return { id: res.data?.id, message: res.data?.message };
  },
};

export default createEmployee;
