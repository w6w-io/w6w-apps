import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/worker-list-by-location.ts";

Deno.test("worker-list-by-location: sends coordinates and radius as query params", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: "w1" }] }]);
  await action.execute!({ longitude: -122.4, latitude: 37.8, radius: 5000 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v2/workers/location");
  assertEquals(url.searchParams.get("longitude"), "-122.4");
  assertEquals(url.searchParams.get("latitude"), "37.8");
  assertEquals(url.searchParams.get("radius"), "5000");
});

Deno.test("worker-list-by-location: longitude and latitude are required", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ latitude: 37.8 }, ctx),
    Error,
    "longitude",
  );
  await assertRejects(
    async () => await action.execute!({ longitude: -122.4 }, ctx),
    Error,
    "latitude",
  );
  assertEquals(calls.length, 0);
});
