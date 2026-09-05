import { assertEquals } from "@std/assert";
import ping from "../../actions/ping.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("ping: hits GET /ping and returns the version string", async () => {
  // Live behaviour, verified 2026-09-05: the body is {"version":"1.0"}, not
  // the {"version":"pong"} the OpenAPI document's own example shows.
  const { ctx, calls } = mockCtx([{ status: 200, body: { version: "1.0" } }]);
  const result = await ping.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/ping");
  assertEquals(result, { version: "1.0" });
});

Deno.test("ping: declares requiresAuth false — it needs no credential", () => {
  assertEquals(ping.requiresAuth, false);
});
