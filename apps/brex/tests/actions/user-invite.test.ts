import { assertEquals } from "@std/assert";
import userInvite from "../../actions/user-invite.ts";
import { bodyOf, errorBody, mockCtx, pathOf, USER } from "../_helpers.ts";

Deno.test("user-invite: POSTs only the fields Brex requires when nothing else is set", async () => {
  const { ctx, calls } = mockCtx([{ body: USER }]);
  const result = await userInvite.execute({
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.com",
  }, ctx) as typeof USER;

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/users");
  assertEquals(bodyOf(calls[0]), {
    first_name: "Ada",
    last_name: "Lovelace",
    email: "ada@example.com",
  });
  assertEquals(result.id, USER.id);
});

Deno.test("user-invite: assignments and metadata are sent under Brex's field names", async () => {
  const { ctx, calls } = mockCtx([{ body: USER }]);
  await userInvite.execute({
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.com",
    managerId: "m1",
    departmentId: "d1",
    locationId: "l1",
    titleId: "t1",
    costCenterId: "c1",
    legalEntityId: "e1",
    metadata: '{"employee_id": "E-1042"}',
  }, ctx);

  assertEquals(bodyOf(calls[0]), {
    first_name: "Ada",
    last_name: "Lovelace",
    email: "ada@example.com",
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
 * Idempotency is the caller's to supply. The app forwards the header when one is
 * given and never invents a value — which is why the action is declared
 * non-idempotent.
 */
Deno.test("user-invite: an idempotency key is forwarded verbatim, and never invented", async () => {
  const withKey = mockCtx([{ body: USER }]);
  await userInvite.execute({
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.com",
    idempotencyKey: "sync-user-1042",
  }, withKey.ctx);
  assertEquals(withKey.calls[0].headers["idempotency-key"], "sync-user-1042");

  const withoutKey = mockCtx([{ body: USER }]);
  await userInvite.execute({
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.com",
  }, withoutKey.ctx);
  assertEquals(withoutKey.calls[0].headers["idempotency-key"], undefined);
});

Deno.test("user-invite: it is a perform and is not declared idempotent", () => {
  assertEquals(userInvite.type, "perform");
  assertEquals(userInvite.idempotent, false);
});

Deno.test("user-invite: an invalid metadata value is refused before the call", async () => {
  const { ctx, calls } = mockCtx([{ body: USER }]);
  let threw = false;
  try {
    await userInvite.execute({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      metadata: "{oops",
    }, ctx);
  } catch (err) {
    threw = true;
    assertEquals((err as Error).message, "Metadata is not valid JSON");
  }
  assertEquals(threw, true);
  assertEquals(calls.length, 0);
});

Deno.test("user-invite: a Brex error surfaces with its code", async () => {
  const { ctx } = mockCtx([
    { status: 400, body: errorBody("VALIDATION_ERROR", "Email is invalid", "INVALID_EMAIL") },
  ]);
  let message = "";
  try {
    await userInvite.execute({ firstName: "A", lastName: "B", email: "nope" }, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assertEquals(message.includes("code INVALID_EMAIL"), true);
});
