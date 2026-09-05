import { assertEquals } from "@std/assert";
import modelAccessConfigurationGet from "../../actions/model-access-configuration-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("model-access-configuration-get: calls GET /teams/model-access/configuration", async () => {
  const { ctx, calls } = mockCtx([
    { body: { teamId: 7, state: "unrestricted", newProviderDefault: null, newModelDefault: null } },
  ]);
  const out = await modelAccessConfigurationGet.execute({}, ctx) as { state: string };
  assertEquals(pathOf(calls[0].url), "/teams/model-access/configuration");
  assertEquals(out.state, "unrestricted");
});
