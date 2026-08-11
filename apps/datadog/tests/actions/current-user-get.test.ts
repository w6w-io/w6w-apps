import { assert, assertEquals, assertRejects } from "@std/assert";
import currentUserGet from "../../actions/current-user-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("current-user-get: calls GET /api/v2/current_user", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      data: { type: "users", id: "u1", attributes: { handle: "ada@example.com" } },
      included: [{ type: "orgs", id: "o1", attributes: { name: "Acme" } }],
    },
  }]);
  const out = await currentUserGet.execute({}, ctx) as {
    data: { id: string };
    included: unknown[];
  };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v2/current_user");
  assertEquals(out.data.id, "u1");
  assertEquals(out.included.length, 1);
});

Deno.test("current-user-get: it takes no parameters", () => {
  assertEquals(currentUserGet.params, []);
  assertEquals(currentUserGet.type, "read");
});

/** With only an API key this endpoint answers 403, and the error says so. */
Deno.test("current-user-get: a 403 surfaces Datadog's own message", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { errors: ["Forbidden"] } }]);
  const err = await assertRejects(
    () => Promise.resolve(currentUserGet.execute({}, ctx)),
    Error,
  );
  assert(err.message.includes("Forbidden"), err.message);
  assert(err.message.includes("application key"), err.message);
});
