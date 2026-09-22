import { assertEquals } from "@std/assert";
import locationGet from "../../actions/location-get.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

const LOCATION = { id: "lc_1", name: "HQ", description: "1 Market St" };

Deno.test("location-get: GETs one location by id", async () => {
  const { ctx, calls } = mockCtx([{ body: LOCATION }]);
  const result = await locationGet.execute({ id: "lc_1" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/locations/lc_1");
  assertEquals(result, LOCATION);
});

Deno.test("location-get: an id with a slash stays one path segment", async () => {
  const { ctx, calls } = mockCtx([{ body: LOCATION }]);
  await locationGet.execute({ id: "lc/1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/locations/lc%2F1");
});

Deno.test("location-get: a missing id surfaces Brex's error", async () => {
  const { ctx } = mockCtx([
    { status: 404, body: errorBody("NOT_FOUND", "Not Found", "LOCATION_NOT_FOUND") },
  ]);
  let message = "";
  try {
    await locationGet.execute({ id: "nope" }, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assertEquals(message.includes("code LOCATION_NOT_FOUND"), true);
});
