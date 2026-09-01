import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/data-bulk-create.ts";

const display = { baseUrl: "https://myapp.bubbleapps.io" };

Deno.test("data-bulk-create: sends one JSON object per line, text/plain", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: '{"status":"success","id":"1x1"}\n{"status":"success","id":"1x2"}',
      headers: { "content-type": "text/plain" },
    },
  ], { display });

  const out = await action.execute({
    type: "Rental Unit",
    records: [{ "Unit name": "Unit A" }, { "Unit name": "Unit B" }],
  }, ctx);

  assertEquals(calls[0].url, "https://myapp.bubbleapps.io/api/1.1/obj/rentalunit/bulk");
  assertEquals(calls[0].headers["content-type"], "text/plain");
  assertEquals(
    calls[0].body,
    '{"Unit name":"Unit A"}\n{"Unit name":"Unit B"}',
  );
  assertEquals(out, [{ status: "success", id: "1x1" }, { status: "success", id: "1x2" }]);
});

Deno.test("data-bulk-create: one malformed line does not fail the others", async () => {
  const { ctx } = mockCtx([
    {
      status: 200,
      body: '{"status":"success","id":"1x1"}\n{"status":"error","message":"bad json"}',
      headers: { "content-type": "text/plain" },
    },
  ], { display });

  const out = await action.execute({
    type: "thing",
    records: [{ a: 1 }, { a: 2 }],
  }, ctx);
  assertEquals(out.length, 2);
  assertEquals(out[1].status, "error");
});

Deno.test("data-bulk-create: refuses more than 1,000 records", async () => {
  const { ctx } = mockCtx([], { display });
  const records = Array.from({ length: 1001 }, (_, i) => ({ n: i }));
  await assertRejects(async () => {
    await action.execute({ type: "thing", records }, ctx);
  });
});

Deno.test("data-bulk-create: refuses an empty list", async () => {
  const { ctx } = mockCtx([], { display });
  await assertRejects(async () => {
    await action.execute({ type: "thing", records: [] }, ctx);
  });
});
