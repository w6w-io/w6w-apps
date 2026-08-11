import { assert, assertEquals, assertRejects } from "@std/assert";
import validate from "../../actions/validate.ts";
import { EU1, mockCtx, pathOf, US1 } from "../_helpers.ts";

Deno.test("validate: calls GET /api/v1/validate and reports the body's own verdict", async () => {
  const { ctx, calls } = mockCtx([{ body: { valid: true } }]);
  const out = await validate.execute({}, ctx) as { valid: boolean; site: string };

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, `${US1}/api/v1/validate`);
  assertEquals(out, { valid: true, site: "us1" });
});

/**
 * The status is not the verdict. A 200 whose body does not say `valid: true` is
 * reported as invalid rather than as success.
 */
Deno.test("validate: a 200 without valid:true is reported false, not true", async () => {
  const { ctx } = mockCtx([{ body: { valid: false } }]);
  assertEquals((await validate.execute({}, ctx) as { valid: boolean }).valid, false);
});

Deno.test("validate: it reports the site it actually checked", async () => {
  const { ctx, calls } = mockCtx([{ body: { valid: true } }], "eu1");
  const out = await validate.execute({}, ctx) as { site: string };
  assertEquals(calls[0].url, `${EU1}/api/v1/validate`);
  assertEquals(out.site, "eu1");
});

Deno.test("validate: a refusal raises with Datadog's message", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { errors: ["Forbidden"] } }]);
  const err = await assertRejects(
    () => Promise.resolve(validate.execute({}, ctx)),
    Error,
  );
  assert(err.message.includes("Forbidden"), err.message);
});

Deno.test("validate: it takes no parameters, so a host can run it with {}", () => {
  assertEquals(validate.params, []);
  assertEquals(validate.type, "read");
  assertEquals(pathOf(`${US1}/api/v1/validate`), "/api/v1/validate");
});
