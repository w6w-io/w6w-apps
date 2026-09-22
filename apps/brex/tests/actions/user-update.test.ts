import { assertEquals } from "@std/assert";
import userUpdate from "../../actions/user-update.ts";
import { bodyOf, mockCtx, pathOf, USER } from "../_helpers.ts";

Deno.test("user-update: PUTs only the fields that were set", async () => {
  const { ctx, calls } = mockCtx([{ body: USER }]);
  await userUpdate.execute({ id: "u1", status: "DISABLED" }, ctx);

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v2/users/u1");
  assertEquals(bodyOf(calls[0]), { status: "DISABLED" });
});

Deno.test("user-update: every documented field is sent under Brex's name", async () => {
  const { ctx, calls } = mockCtx([{ body: USER }]);
  await userUpdate.execute({
    id: "u1",
    status: "ACTIVE",
    managerId: "m1",
    departmentId: "d1",
    locationId: "l1",
    titleId: "t1",
    costCenterId: "c1",
    legalEntityId: "e1",
    metadata: '{"employee_id": "E-1042"}',
  }, ctx);

  assertEquals(bodyOf(calls[0]), {
    status: "ACTIVE",
    manager_id: "m1",
    department_id: "d1",
    location_id: "l1",
    title_id: "t1",
    cost_center_id: "c1",
    legal_entity_id: "e1",
    metadata: { employee_id: "E-1042" },
  });
});

/**
 * The update status enum is two values — `ACTIVE` and `DISABLED` — not the six
 * the list filter accepts. Offering the wider set here would produce a request
 * Brex does not document.
 */
Deno.test("user-update: the status select offers exactly the two updateable statuses", () => {
  const status = userUpdate.params?.find((p) => p.key === "status");
  assertEquals(status?.type, "select");
  assertEquals((status?.options as Array<{ value: string }>).map((o) => o.value), [
    "ACTIVE",
    "DISABLED",
  ]);
});

Deno.test("user-update: an idempotency key is forwarded verbatim", async () => {
  const { ctx, calls } = mockCtx([{ body: USER }]);
  await userUpdate.execute({ id: "u1", status: "ACTIVE", idempotencyKey: "step-9" }, ctx);

  assertEquals(calls[0].headers["idempotency-key"], "step-9");
});

/** `PUT` with unset fields unchanged: the same input lands on the same state. */
Deno.test("user-update: it is a perform declared idempotent", () => {
  assertEquals(userUpdate.type, "perform");
  assertEquals(userUpdate.idempotent, true);
});
