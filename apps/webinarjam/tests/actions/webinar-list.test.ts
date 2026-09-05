import { assertEquals } from "@std/assert";
import webinarList from "../../actions/webinar-list.ts";
import { mockWebinarJamCtx, ok, pathOf } from "../_helpers.ts";

Deno.test("webinar-list: hits {product}/webinars and returns the webinars array", async () => {
  const webinars = [
    {
      webinar_id: 1,
      webinar_hash: "abcd1234",
      name: "Demo1",
      title: "Demo1",
      description: "A series of events",
      type: "Series of presentations",
      schedules: ["Every day, 01:00 PM"],
      timezone: "America/Los_Angeles",
    },
  ];
  const { ctx, calls } = mockWebinarJamCtx([{ body: ok({ webinars }) }]);
  const out = await webinarList.execute({ product: "webinarjam" }, ctx) as { webinars: unknown[] };
  assertEquals(pathOf(calls[0].url), "/webinarjam/webinars");
  assertEquals(calls[0].method, "POST");
  assertEquals(out.webinars, webinars);
});

Deno.test("webinar-list: the everwebinar product hits the everwebinar prefix", async () => {
  const { ctx, calls } = mockWebinarJamCtx([{ body: ok({ webinars: [] }) }]);
  await webinarList.execute({ product: "everwebinar" }, ctx);
  assertEquals(pathOf(calls[0].url), "/everwebinar/webinars");
});

Deno.test("webinar-list: a missing webinars field returns an empty array, not undefined", async () => {
  const { ctx } = mockWebinarJamCtx([{ body: ok() }]);
  const out = await webinarList.execute({ product: "webinarjam" }, ctx) as { webinars: unknown[] };
  assertEquals(out.webinars, []);
});

Deno.test("webinar-list: is a read, and defaults the product to webinarjam", () => {
  assertEquals(webinarList.type, "read");
  const product = webinarList.params?.find((p) => p.key === "product");
  assertEquals(product?.default, "webinarjam");
  assertEquals(product?.required, true);
});
