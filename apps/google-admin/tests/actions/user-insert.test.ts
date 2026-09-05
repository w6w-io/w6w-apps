import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-insert.ts";

Deno.test("user-insert: POSTs /users with name split into given/family", async () => {
  const body = { id: "u-1" };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({
    primaryEmail: "new@example.com",
    givenName: "Ada",
    familyName: "Lovelace",
  }, ctx);

  assertEquals(calls[0].method, "POST");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/admin/directory/v1/users");
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent, {
    primaryEmail: "new@example.com",
    name: { givenName: "Ada", familyName: "Lovelace" },
  });
  assertEquals(result, body);
});

Deno.test("user-insert: forwards optional fields when supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({
    primaryEmail: "new@example.com",
    givenName: "Ada",
    familyName: "Lovelace",
    password: "s3cret!",
    orgUnitPath: "/Sales",
    changePasswordAtNextLogin: true,
    suspended: false,
  }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.password, "s3cret!");
  assertEquals(sent.orgUnitPath, "/Sales");
  assertEquals(sent.changePasswordAtNextLogin, true);
  assertEquals(sent.suspended, false);
});

Deno.test("user-insert: is not idempotent", () => {
  assertEquals(action.idempotent, false);
});
