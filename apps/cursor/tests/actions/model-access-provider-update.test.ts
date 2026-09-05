import { assertEquals } from "@std/assert";
import modelAccessProviderUpdate from "../../actions/model-access-provider-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("model-access-provider-update: PUTs { enabled } to /providers/:provider", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "openai", enabled: false } }]);
  await modelAccessProviderUpdate.execute({ provider: "openai", enabled: false }, ctx);
  assertEquals(pathOf(calls[0].url), "/teams/model-access/providers/openai");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { enabled: false });
});
