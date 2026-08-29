import { assertEquals } from "@std/assert";
import userCreate from "../../actions/user-create.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("user-create: POSTs a one-element array, dropping unset optional fields", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ results: [{ userId: 1 }] }) }]);
  await userCreate.execute(
    { firstName: "Ada", lastName: "Lovelace", phoneNumber: "+15551234567", userType: "user" },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/users/v1/users");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), [
    { firstName: "Ada", lastName: "Lovelace", phoneNumber: "+15551234567", userType: "user" },
  ]);
});

Deno.test("user-create: sendActivation is sent as a query parameter, not in the body", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ results: [] }) }]);
  await userCreate.execute(
    {
      firstName: "Ada",
      lastName: "Lovelace",
      phoneNumber: "+1",
      userType: "user",
      sendActivation: true,
    },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("sendActivation"), "true");
});

Deno.test("user-create: is marked not idempotent — retrying creates a second employee", () => {
  assertEquals(userCreate.idempotent, false);
});
