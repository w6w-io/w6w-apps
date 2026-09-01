import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/data-get.ts";

const display = { baseUrl: "https://myapp.bubbleapps.io" };

Deno.test("data-get: fetches by unique ID and unwraps `response`", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { response: { _id: "1x1", "Unit name": "Unit A" } } },
  ], { display });

  const out = await action.execute({ type: "Rental Unit", uniqueId: "1x1" }, ctx);

  assertEquals(calls[0].url, "https://myapp.bubbleapps.io/api/1.1/obj/rentalunit/1x1");
  assertEquals(calls[0].method, "GET");
  assertEquals(out, { _id: "1x1", "Unit name": "Unit A" });
});

Deno.test("data-get: a 404 (type not exposed, or missing record) throws with Bubble's message", async () => {
  const { ctx } = mockCtx([
    {
      status: 404,
      body: {
        statusCode: 404,
        body: { status: "MISSING_DATA", message: "Missing object of type thing" },
      },
    },
  ], { display });

  await assertRejectsWith(
    async () => {
      await action.execute({ type: "thing", uniqueId: "nope" }, ctx);
    },
    "Missing object of type thing",
  );
});

async function assertRejectsWith(fn: () => Promise<unknown>, includes: string) {
  try {
    await fn();
    throw new Error("expected rejection");
  } catch (err) {
    if (!(err instanceof Error) || !err.message.includes(includes)) {
      throw new Error(`expected error to include "${includes}", got: ${err}`);
    }
  }
}
