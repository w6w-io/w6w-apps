import { assertEquals } from "@std/assert";
import respondentCreate from "../../actions/respondent-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("respondent-create: POSTs only the provided contact fields", async () => {
  const { ctx, calls } = mockCtx([
    { status: 201, body: { id: "r1", name: "Johnny Rose", email: "jr@example.com" } },
  ]);
  const out = await respondentCreate.execute(
    { name: "Johnny Rose", email: "jr@example.com" },
    ctx,
  ) as {
    id: string;
  };
  assertEquals(pathOf(calls[0].url), "/respondents");
  assertEquals(JSON.parse(calls[0].body!), { name: "Johnny Rose", email: "jr@example.com" });
  assertEquals(out.id, "r1");
});

Deno.test("respondent-create: with nothing set, sends an empty body rather than nulls", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await respondentCreate.execute({}, ctx);
  assertEquals(JSON.parse(calls[0].body!), {});
});
