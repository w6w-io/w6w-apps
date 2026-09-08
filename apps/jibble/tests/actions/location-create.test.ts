import { assertEquals, assertRejects } from "@std/assert";
import locationCreate from "../../actions/location-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("location-create: builds nested coordinates and geoFence objects", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "loc1" } }]);
  await locationCreate.execute({
    name: "HQ",
    latitude: 42,
    longitude: -13.5,
    geoFenceRadius: 100,
    geoFenceUnits: "Meters",
  }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/Locations");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.coordinates, { latitude: 42, longitude: -13.5 });
  assertEquals(body.geoFence, { radius: 100, units: "Meters" });
});

Deno.test("location-create: omits coordinates/geoFence entirely when unset", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "loc1" } }]);
  await locationCreate.execute({ name: "HQ" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals("coordinates" in body, false);
  assertEquals("geoFence" in body, false);
});

Deno.test("location-create: requires name", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(locationCreate.execute({ name: "" }, ctx)),
    Error,
    "name",
  );
});
