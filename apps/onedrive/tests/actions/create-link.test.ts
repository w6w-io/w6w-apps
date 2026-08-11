import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-link.ts";

Deno.test("create-link: POSTs to the item's createLink action", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "p1" } }]);
  await action.execute({ itemId: "01ABC", type: "view" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/drive/items/01ABC/createLink");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { type: "view" });
});

Deno.test("create-link: carries scope, password and expiry when given", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await action.execute({
    itemId: "i",
    type: "edit",
    scope: "anonymous",
    password: "s3cret",
    expirationDateTime: "2026-12-31T00:00:00Z",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    type: "edit",
    scope: "anonymous",
    password: "s3cret",
    expirationDateTime: "2026-12-31T00:00:00Z",
  });
});

Deno.test("create-link: retainInheritedPermissions is sent only to turn it off", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }, { body: {} }]);
  await action.execute({ itemId: "i", type: "view", retainInheritedPermissions: false }, ctx);
  assertEquals(JSON.parse(calls[0].body!).retainInheritedPermissions, false);
  // `true` is the service default, so it is not restated.
  await action.execute({ itemId: "i", type: "view", retainInheritedPermissions: true }, ctx);
  assertEquals("retainInheritedPermissions" in JSON.parse(calls[1].body!), false);
});

Deno.test("create-link: the password field is a secret, so it is masked and encrypted", () => {
  const password = (action.params ?? []).find((p) => p.key === "password");
  assertEquals(password?.type, "secret");
});

Deno.test("create-link: returns the permission with its link facet", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      id: "perm1",
      roles: ["read"],
      link: { type: "view", scope: "anonymous", webUrl: "https://1drv.ms/x" },
    },
  }]);
  const out = await action.execute({ itemId: "i", type: "view" }, ctx) as Record<string, unknown>;
  assertEquals((out.link as Record<string, string>).webUrl, "https://1drv.ms/x");
});

Deno.test("create-link: is idempotent — Graph returns the existing link on a repeat", () => {
  assertEquals(action.idempotent, true);
});
