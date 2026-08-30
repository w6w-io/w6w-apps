import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/add-workspace-user.ts";

Deno.test("add-workspace-user: POSTs /groups/{id}/users with the required fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  await action.execute(
    {
      groupId: "w1",
      identifier: "ada@contoso.com",
      principalType: "User",
      groupUserAccessRight: "Viewer",
    },
    ctx,
  );
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/myorg/groups/w1/users");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    identifier: "ada@contoso.com",
    principalType: "User",
    groupUserAccessRight: "Viewer",
  });
});

Deno.test("add-workspace-user: optional displayName/emailAddress are included only when set", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  await action.execute(
    {
      groupId: "w1",
      identifier: "ada@contoso.com",
      principalType: "User",
      groupUserAccessRight: "Admin",
      displayName: "Ada",
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.displayName, "Ada");
  assertEquals("emailAddress" in body, false);
});

Deno.test("add-workspace-user: re-granting the same access right converges — idempotent", () => {
  assertEquals(action.idempotent, true);
});
