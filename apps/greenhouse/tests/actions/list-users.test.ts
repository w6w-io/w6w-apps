import { assert, assertEquals, assertThrows } from "@std/assert";
import listUsers from "../../actions/list-users.ts";
import { listPage, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("list-users: calls GET /v3/users", async () => {
  const { ctx, calls } = mockCtx([listPage([{ id: 1 }])]);
  await listUsers.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v3/users");
});

Deno.test("list-users: maps the external-system lookups Greenhouse offers", async () => {
  const { ctx, calls } = mockCtx([listPage([])]);
  await listUsers.execute({
    primaryEmail: "a@b.com",
    employeeIds: "E1,E2",
    officeIds: "1",
    departmentIds: "2",
    externalOfficeId: "OFF-1",
    externalDepartmentId: "DEP-1",
  }, ctx);

  assertEquals(queryOf(calls[0].url), {
    primary_email: "a@b.com",
    employee_ids: "E1,E2",
    office_ids: "1",
    department_ids: "2",
    external_office_id: "OFF-1",
    external_department_id: "DEP-1",
  });
});

/**
 * Both defaults are surprising and both are opt-in to change: service accounts
 * are hidden unless asked for, and omitting `deactivated` returns leavers
 * alongside everyone else.
 */
Deno.test("list-users: service accounts are only requested when explicitly asked for", async () => {
  const { ctx, calls } = mockCtx([listPage([]), listPage([])]);
  await listUsers.execute({}, ctx);
  assertEquals(queryOf(calls[0].url), {});

  await listUsers.execute({ showServiceAccounts: true, deactivated: false }, ctx);
  assertEquals(queryOf(calls[1].url), { show_service_accounts: "true", deactivated: "false" });
});

Deno.test("list-users: the hidden-default fields say so in their hints", () => {
  const byKey = Object.fromEntries((listUsers.params ?? []).map((p) => [p.key, p]));
  assert(byKey.showServiceAccounts.hint?.includes("hidden by default"));
  assert(byKey.deactivated.hint?.includes("leavers"));
});

Deno.test("list-users: a cursor rejects the e-mail filter it already carries", () => {
  const { ctx } = mockCtx([]);
  const err = assertThrows(
    () => listUsers.execute({ cursor: "N", primaryEmail: "a@b.com" }, ctx),
    Error,
  );
  assert(err.message.includes("primary_email"), err.message);
});
