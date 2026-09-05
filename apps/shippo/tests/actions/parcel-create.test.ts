import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/parcel-create.ts";

Deno.test("parcel-create: dimensions and weight are sent as strings, not numbers", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { object_id: "prc_1" } }]);
  await action.execute!(
    { length: 10, width: 8, height: 4, distanceUnit: "in", weight: 16, massUnit: "oz" },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, {
    length: "10",
    width: "8",
    height: "4",
    distance_unit: "in",
    weight: "16",
    mass_unit: "oz",
  });
});

Deno.test("parcel-create: every dimension is required", async () => {
  for (const missing of ["length", "width", "height", "weight"]) {
    const input: Record<string, unknown> = {
      length: 10,
      width: 8,
      height: 4,
      distanceUnit: "in",
      weight: 16,
      massUnit: "oz",
    };
    input[missing] = "";
    const { ctx, calls } = mockCtx([]);
    await assertRejects(async () => await action.execute!(input, ctx), Error, missing);
    assertEquals(calls.length, 0);
  }
});

Deno.test("parcel-create: logs the parcel id only", async () => {
  const { ctx, logs } = mockCtx([{ status: 200, body: { object_id: "prc_1" } }]);
  await action.execute!(
    { length: 10, width: 8, height: 4, distanceUnit: "in", weight: 16, massUnit: "oz" },
    ctx,
  );
  assertEquals(logs[0].data, { parcelId: "prc_1" });
  assert(logs[0].message.includes("parcel"));
});
