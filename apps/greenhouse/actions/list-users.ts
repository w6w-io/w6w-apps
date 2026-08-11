import type { ActionDefinition } from "@w6w/types";
import { buildListQuery, HarvestClient, type HarvestPage, idList } from "../lib/client.ts";
import { type BaseListInput, baseListQuery } from "../lib/list.ts";
import {
  createdAtParams,
  fieldsParam,
  idsParam,
  listOutput,
  paginationParams,
  updatedAtParams,
} from "../lib/params.ts";

/**
 * `GET /v3/users` — the Greenhouse accounts inside the organisation.
 *
 * Recruiters, hiring managers, interviewers, coordinators and site admins. This
 * is where the numeric `user_id` used everywhere else comes from — the `sub` on
 * a connection, `email_from_user_id` on a move, `user_id` on a note.
 *
 * Two things about the default result set are easy to trip over:
 *
 *  - **Service accounts are hidden.** Integration service users (the accounts
 *    Greenhouse creates alongside an OAuth credential) do not appear unless
 *    `show_service_accounts` is on. If you are looking for the user your own
 *    connection acts as, that is why you cannot find it.
 *  - **`deactivated` is a filter, not a state you can ignore.** Omit it and both
 *    live and deactivated users come back, so an "everyone" sync silently
 *    includes leavers.
 */
interface Input extends BaseListInput {
  officeIds?: string;
  departmentIds?: string;
  employeeIds?: string;
  primaryEmail?: string;
  externalOfficeId?: string;
  externalDepartmentId?: string;
  deactivated?: boolean;
  showServiceAccounts?: boolean;
}

const listUsers: ActionDefinition<Input, HarvestPage<unknown>> = {
  key: "list-users",
  type: "search",
  resource: "user",
  title: "List Users",
  description:
    "List Greenhouse users, optionally filtered by office, department, employee id or e-mail.",
  params: [
    {
      key: "primaryEmail",
      label: "Primary e-mail",
      type: "string",
      hint: "Exact match on the sign-in address — the cheapest way to turn an e-mail into a " +
        "numeric user id.",
    },
    {
      key: "employeeIds",
      label: "Employee ids",
      type: "string",
      hint: "Comma-separated HRIS employee ids, for matching Greenhouse users to an external " +
        "system without an id round-trip.",
    },
    { key: "officeIds", label: "Office ids", type: "string", hint: "Comma-separated." },
    { key: "departmentIds", label: "Department ids", type: "string", hint: "Comma-separated." },
    {
      key: "externalOfficeId",
      label: "External office id",
      type: "string",
      hint: "The office's id in your own system, if one was recorded on the office.",
    },
    {
      key: "externalDepartmentId",
      label: "External department id",
      type: "string",
    },
    {
      key: "deactivated",
      label: "Deactivated only",
      type: "boolean",
      hint: "On returns only deactivated users, off only active ones. Omit and you get both — " +
        "which means leavers are included by default.",
    },
    {
      key: "showServiceAccounts",
      label: "Include service accounts",
      type: "boolean",
      hint: "Integration service users are hidden by default. Turn this on to see the account " +
        "an OAuth credential acts as.",
    },
    ...createdAtParams(),
    ...updatedAtParams(),
    idsParam,
    fieldsParam,
    ...paginationParams(),
  ],
  output: listOutput("Users"),

  execute(input, ctx) {
    return new HarvestClient(ctx).list("/users", {
      query: buildListQuery(input.cursor, {
        ...baseListQuery(input),
        office_ids: idList(input.officeIds, "officeIds"),
        department_ids: idList(input.departmentIds, "departmentIds"),
        employee_ids: idList(input.employeeIds, "employeeIds"),
        primary_email: input.primaryEmail,
        external_office_id: input.externalOfficeId,
        external_department_id: input.externalDepartmentId,
        deactivated: input.deactivated,
        show_service_accounts: input.showServiceAccounts,
      }),
    });
  },
};

export default listUsers;
