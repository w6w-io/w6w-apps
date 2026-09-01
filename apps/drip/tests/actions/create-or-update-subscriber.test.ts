import { assertEquals } from "@std/assert";
import { mockDripCtx } from "../_helpers.ts";
import action from "../../actions/create-or-update-subscriber.ts";

Deno.test("create-or-update-subscriber: POSTs a single-element subscribers array", async () => {
  const { ctx, calls } = mockDripCtx([{
    body: { subscribers: [{ id: "abc", email: "john@acme.com", status: "active" }] },
  }]);
  const out = await action.execute({ email: "john@acme.com" }, ctx);
  assertEquals(calls[0].url, "https://api.getdrip.com/v2/1234567/subscribers");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { subscribers: [{ email: "john@acme.com" }] });
  assertEquals(out, { id: "abc", email: "john@acme.com", status: "active" });
});

Deno.test("create-or-update-subscriber: forwards optional fields, tags, and custom fields", async () => {
  const { ctx, calls } = mockDripCtx([{ body: { subscribers: [{}] } }]);
  await action.execute(
    {
      email: "john@acme.com",
      firstName: "John",
      timeZone: "America/Los_Angeles",
      status: "active",
      tags: "Customer, SEO",
      removeTags: "Prospect",
      customFields: { shirt_size: "Medium" },
    },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), {
    subscribers: [{
      email: "john@acme.com",
      first_name: "John",
      time_zone: "America/Los_Angeles",
      status: "active",
      tags: ["Customer", "SEO"],
      remove_tags: ["Prospect"],
      custom_fields: { shirt_size: "Medium" },
    }],
  });
});

Deno.test("create-or-update-subscriber: drops blank optional fields rather than sending them", async () => {
  const { ctx, calls } = mockDripCtx([{ body: { subscribers: [{}] } }]);
  await action.execute({ email: "john@acme.com", firstName: "", tags: "" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { subscribers: [{ email: "john@acme.com" }] });
});
