import { assertEquals } from "@std/assert";
import whoamiGet from "../../actions/whoami-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("whoami-get: calls GET /v3/whoami and returns the body verbatim", async () => {
  const { ctx, calls } = mockCtx([{ body: { userId: 1, username: "acme", teamId: 2 } }]);
  const out = await whoamiGet.execute({}, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v3/whoami");
  assertEquals(out, { userId: 1, username: "acme", teamId: 2 });
});

Deno.test("whoami-get: takes no parameters", () => {
  assertEquals(whoamiGet.params?.length, 0);
});
