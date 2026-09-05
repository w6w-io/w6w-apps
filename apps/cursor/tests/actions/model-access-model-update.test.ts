import { assertEquals } from "@std/assert";
import modelAccessModelUpdate from "../../actions/model-access-model-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("model-access-model-update: PUTs enabled + parameters to the model path", async () => {
  const { ctx, calls } = mockCtx([
    { body: { id: "claude-opus-4-6", enabled: true, provider: "anthropic", parameters: [] } },
  ]);
  await modelAccessModelUpdate.execute({
    provider: "anthropic",
    model: "claude-opus-4-6",
    enabled: true,
    parameters: { fast: { allowedValues: ["false"] } },
  }, ctx);
  assertEquals(
    pathOf(calls[0].url),
    "/teams/model-access/providers/anthropic/models/claude-opus-4-6",
  );
  assertEquals(calls[0].method, "PUT");
  assertEquals(
    JSON.parse(calls[0].body!),
    { enabled: true, parameters: { fast: { allowedValues: ["false"] } } },
  );
});

Deno.test("model-access-model-update: omits parameters entirely when not given", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "gpt-5.4", enabled: true } }]);
  await modelAccessModelUpdate.execute(
    { provider: "openai", model: "gpt-5.4", enabled: true },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), { enabled: true });
});

Deno.test("model-access-model-update: passes null through to clear a restriction", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "gpt-5.4", enabled: true } }]);
  await modelAccessModelUpdate.execute({
    provider: "openai",
    model: "gpt-5.4",
    enabled: true,
    parameters: { reasoning: { allowedValues: null, defaultValue: null } },
  }, ctx);
  assertEquals(
    JSON.parse(calls[0].body!).parameters,
    { reasoning: { allowedValues: null, defaultValue: null } },
  );
});

Deno.test("model-access-model-update: accepts parameters as a JSON string", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "gpt-5.4", enabled: true } }]);
  await modelAccessModelUpdate.execute({
    provider: "openai",
    model: "gpt-5.4",
    enabled: true,
    parameters: JSON.stringify({ reasoning: { defaultValue: "high" } }),
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).parameters, { reasoning: { defaultValue: "high" } });
});
