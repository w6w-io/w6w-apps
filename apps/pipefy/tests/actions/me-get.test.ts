import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import meGet from "../../actions/me-get.ts";

Deno.test("me-get: returns the current user", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { me: { id: "u1", name: "Ada", email: "ada@example.com", username: "ada" } } },
  }]);
  const out = await meGet.execute({}, ctx) as { id: string; name: string };
  assertEquals(out.id, "u1");
  assertEquals(out.name, "Ada");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.query, "{ me { id name email username } }");
});

Deno.test("me-get: type/resource metadata", () => {
  assertEquals(meGet.type, "read");
  assertEquals(meGet.resource, "user");
  assertEquals(meGet.requiresAuth, undefined);
});
