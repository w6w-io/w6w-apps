import { assertEquals } from "@std/assert";
import jobsCreate from "../../actions/jobs-create.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("jobs-create: supplied rows become an array of {id, email, name} objects", async () => {
  const body = { status: "success", job_id: 150970, execution_time: 712 };
  const { ctx, calls } = mockCtx([{ body }]);

  const result = await jobsCreate.execute({
    inputLocation: "supplied",
    emails: ["support@neverbounce.com", "invalid@neverbounce.com"],
    names: ["Fred McValid", "Bob McInvalid"],
    ids: ["12345", "12346"],
    filename: "SampleNeverBounceAPI.csv",
    autoParse: true,
    autoStart: true,
  }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  const sentBody = JSON.parse(calls[0].body!);
  assertEquals(sentBody.input_location, "supplied");
  assertEquals(sentBody.input, [
    { id: "12345", email: "support@neverbounce.com", name: "Fred McValid" },
    { id: "12346", email: "invalid@neverbounce.com", name: "Bob McInvalid" },
  ]);
  assertEquals(sentBody.filename, "SampleNeverBounceAPI.csv");
  assertEquals(sentBody.auto_parse, true);
  assertEquals(sentBody.auto_start, true);
  assertEquals(result, body);
});

Deno.test("jobs-create: remote_url input sends the URL as `input` directly", async () => {
  const { ctx, calls } = mockCtx([
    { body: { status: "success", job_id: 1, execution_time: 1 } },
  ]);

  await jobsCreate.execute({
    inputLocation: "remote_url",
    remoteUrl: "https://mydomain.com/my_file.csv",
  }, ctx);

  const sentBody = JSON.parse(calls[0].body!);
  assertEquals(sentBody.input_location, "remote_url");
  assertEquals(sentBody.input, "https://mydomain.com/my_file.csv");
});

Deno.test("jobs-create: rows without a name/id omit those keys", async () => {
  const { ctx, calls } = mockCtx([
    { body: { status: "success", job_id: 1, execution_time: 1 } },
  ]);

  await jobsCreate.execute({ inputLocation: "supplied", emails: ["a@b.com"] }, ctx);

  const sentBody = JSON.parse(calls[0].body!);
  assertEquals(sentBody.input, [{ email: "a@b.com" }]);
});
