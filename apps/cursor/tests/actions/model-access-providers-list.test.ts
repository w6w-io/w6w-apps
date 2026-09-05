import { assertEquals } from "@std/assert";
import modelAccessProvidersList from "../../actions/model-access-providers-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("model-access-providers-list: calls GET /teams/model-access/providers", async () => {
  const { ctx, calls } = mockCtx([
    { body: { teamId: 7, state: "custom", providers: [{ id: "openai", models: [] }] } },
  ]);
  const out = await modelAccessProvidersList.execute({}, ctx) as { providers: unknown[] };
  assertEquals(pathOf(calls[0].url), "/teams/model-access/providers");
  assertEquals(out.providers.length, 1);
});

Deno.test("model-access-providers-list: propagates a 409 (no custom policy) as an error", async () => {
  const { ctx } = mockCtx([{ status: 409, body: { code: "error", message: "no custom policy" } }]);
  let threw = false;
  try {
    await modelAccessProvidersList.execute({}, ctx);
  } catch (err) {
    threw = true;
    if (err instanceof Error) assertEquals(err.message.includes("no custom policy"), true);
  }
  assertEquals(threw, true);
});
