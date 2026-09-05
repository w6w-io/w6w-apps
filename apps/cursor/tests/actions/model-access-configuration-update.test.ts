import { assertEquals, assertRejects } from "@std/assert";
import modelAccessConfigurationUpdate from "../../actions/model-access-configuration-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("model-access-configuration-update: sends { state: unrestricted } verbatim", async () => {
  const { ctx, calls } = mockCtx([
    { body: { teamId: 7, state: "unrestricted", newProviderDefault: null, newModelDefault: null } },
  ]);
  await modelAccessConfigurationUpdate.execute({ state: "unrestricted" }, ctx);
  assertEquals(pathOf(calls[0].url), "/teams/model-access/configuration");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { state: "unrestricted" });
});

Deno.test("model-access-configuration-update: sends defaults when state is not unrestricted", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        teamId: 7,
        state: "custom",
        newProviderDefault: "disabled",
        newModelDefault: "enabled",
      },
    },
  ]);
  await modelAccessConfigurationUpdate.execute(
    { newProviderDefault: "disabled", newModelDefault: "enabled" },
    ctx,
  );
  assertEquals(
    JSON.parse(calls[0].body!),
    { newProviderDefault: "disabled", newModelDefault: "enabled" },
  );
});

Deno.test("model-access-configuration-update: rejects when nothing is set", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(async () => await modelAccessConfigurationUpdate.execute({}, ctx));
});
