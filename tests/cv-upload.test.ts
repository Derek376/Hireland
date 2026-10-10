import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { uploadCv, MAX_CV_FILE_BYTES } from "../src/server/cv-upload.ts";
import { saveProfile, getProfile } from "../src/server/profile.ts";
import { seedJobs } from "../src/server/seed.ts";
import { closeDatabase, getDatabase } from "../src/server/db.ts";
import { createAssessmentService, getAssessmentView } from "../src/server/assessments.ts";
import { requirementQuoteCandidates } from "../src/server/assessment-output.ts";
import { getWorkspaceData } from "../src/server/workspace.ts";
import { success } from "../src/server/results.ts";

// Minimal text PDF assembled in memory, containing only fictional test data.
function textPdf(text: string) {
  const stream = `BT /F1 12 Tf 20 100 Td (${text}) Tj ET`;
  const objects = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>", `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`];
  let pdf = "%PDF-1.4\n"; const offsets = [0];
  objects.forEach((object, i) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${i + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf);
}
const docx = Buffer.from("UEsDBBQAAAAIAGt3Sl26d6ScywAAAFMBAAATAAAAW0NvbnRlbnRfVHlwZXNdLnhtbJWQvVLDQAyEX+XmWiYnQ0HB2E4BtEDBC2jOsn3D/c1JCeHtkRNIQUcp7Wq/HfX7U4rmSI1DyYO9dZ3dj/37VyU2qmQe7CpSHwDYr5SQXamUVZlLSyg6tgUq+g9cCO667h58yUJZdrJl2LF/ohkPUczzSdcXSqPI1jxejBtrsFhrDB5FdTjm6Q9l90Nwenn28Boq36jBwti/av0WJjJv2OQFk8bBZ2kTTMUfkiLcZvwXr8xz8HS939JqK56YQ15SdFclYci/PeD8tvEbUEsDBBQAAAAIAGt3Sl1fM5VSlQAAAAcBAAALAAAAX3JlbHMvLnJlbHONzzsOwjAMBuCrRD5AnTIwoKZdWLoiLhAlblPRPOSE1+3JwEARA6N///osd8PDr+JGnJcYFLSNhKHvTrTqUoPslpRFbYSswJWSDojZOPI6NzFRqJspsteljjxj0uaiZ8KdlHvkTwO2phitAh5tC+L8TPSPHadpMXSM5uoplB8nvhpV1jxTUXCPbNG+46aygH2Hmxf7F1BLAwQUAAAACABrd0pdF2iA46MAAADUAAAAEQAAAHdvcmQvZG9jdW1lbnQueG1sRY67DsIwDEV/JcqMksLAUPUxgEBiYUBCrCENbUSdRI5p4e9JysByLOvKx7dq3zCyyWC03tV8LQreNtVcdl6/wDhiKXaxnGs+EIVSyqgHAyoKH4xL2cMjKEor9nL22AX02sRoXQ+j3BTFVoKyjmfl3XefPEMGZlBzsJrSYzWy/Xl3Y7urYCc1qYtGG2jFjjaBjIKkfopK5pNMXBgW/rTyX7n5AlBLAQIUAxQAAAAIAGt3Sl26d6ScywAAAFMBAAATAAAAAAAAAAAAAACAAQAAAABbQ29udGVudF9UeXBlc10ueG1sUEsBAhQDFAAAAAgAa3dKXV8zlVKVAAAABwEAAAsAAAAAAAAAAAAAAIAB/AAAAF9yZWxzLy5yZWxzUEsBAhQDFAAAAAgAa3dKXRdogOOjAAAA1AAAABEAAAAAAAAAAAAAAIABugEAAHdvcmQvZG9jdW1lbnQueG1sUEsFBgAAAAADAAMAuQAAAIwCAAAAAA==", "base64");

test("CV attachments: local extraction, persisted metadata and safe assessment invalidation", async t => {
  const directory = mkdtempSync(join(tmpdir(), "hireland-cv-upload-"));
  const previous = { path: process.env.DATABASE_PATH, key: process.env.OPENROUTER_API_KEY, model: process.env.OPENROUTER_MODEL };
  process.env.DATABASE_PATH = join(directory, "test.sqlite");
  process.env.OPENROUTER_API_KEY = "fictional-test-key"; process.env.OPENROUTER_MODEL = "offline-test-model";
  try {
    seedJobs();
    const cv = readFileSync(new URL("../data/seed/demo-cv.txt", import.meta.url), "utf8").trim();
    assert.ok((await saveProfile({ cvText: cv, preferences: ["Technology", "Finance"] })).ok);
    let calls = 0;
    const assess = createAssessmentService(async input => { calls++; return success({ decision: "YES", score: 78, reason: "Offline UI fixture, not a real assessment.", strengths: [{ reason: "Offline supported fixture.", cvQuote: "TypeScript, JavaScript, React, HTML, CSS, SQL, Python, Git.", jdQuote: requirementQuoteCandidates(input.job.description)[0] }], gaps: [], unknowns: ["Fictional vacancy."] }); });
    assert.ok((await assess("job-01")).ok);
    const before = await getProfile();
    await t.test("unsupported, oversized, empty, corrupt and unreadable files preserve the previous CV and result", async () => {
      for (const file of [new File(["CV"], "cv.exe"), new File([new Uint8Array(MAX_CV_FILE_BYTES + 1)], "cv.txt"), new File([], "cv.txt"), new File(["not a PDF"], "cv.pdf"), new File(["PKinvalid zip"], "cv.docx"), new File([new Uint8Array([0xff, 0xff])], "cv.txt"), new File(["\x00binary"], "cv.txt"), new File(["  "], "cv.txt"), new File(["x".repeat(12001)], "cv.txt"), new File(["CV"], "../cv.txt"), new File([textPdf("")], "scan.pdf")]) {
        const result = await uploadCv(file); assert.equal(result.ok, false, file.name);
        assert.deepEqual(await getProfile(), before);
      }
      const view = await getAssessmentView("job-01"); assert.ok(view.ok); assert.ok(view.value.assessment);
      assert.equal(calls, 1);
    });
    await t.test("TXT updates CV, retains directions, and excludes the old assessment without provider work", async () => {
      const result = await uploadCv(new File(["Fictional updated CV. JavaScript, Git and teamwork."], "Fictional CV.txt"));
      assert.ok(result.ok); assert.equal(result.value.fileName, "Fictional CV.txt");
      assert.deepEqual(result.value.preferences, ["Technology", "Finance"]);
      const view = await getAssessmentView("job-01"); assert.ok(view.ok); assert.equal(view.value.assessment, null);
      assert.equal(getDatabase().prepare("SELECT count(*) AS n FROM assessments").get()?.n, 1);
      assert.equal(calls, 1);
    });
    await t.test("real PDF text extraction supports the uploaded document", async () => {
      const result = await uploadCv(new File([textPdf("Fictional PDF CV. JavaScript and Git.")], "Fictional CV.pdf"));
      assert.ok(result.ok); assert.match(result.value.cvText, /Fictional PDF CV\. JavaScript and Git\./);
      assert.equal(result.value.fileName, "Fictional CV.pdf");
    });
    await t.test("real DOCX text extraction ignores document HTML", async () => {
      const result = await uploadCv(new File([docx], "Fictional CV.docx"));
      assert.ok(result.ok); assert.match(result.value.cvText, /Fictional DOCX CV\. JavaScript, Git, teamwork\./);
      assert.equal(result.value.fileName, "Fictional CV.docx");
    });
    await t.test("workspace exposes filename/date, never the full CV, and metadata survives reopening", async () => {
      closeDatabase();
      const profile = await getProfile(); assert.ok(profile.ok && profile.value);
      assert.equal(profile.value.fileName, "Fictional CV.docx");
      const data = await getWorkspaceData(); assert.ok(data.ok);
      assert.deepEqual(data.value.cv, { fileName: "Fictional CV.docx", updatedAt: profile.value.updatedAt });
      assert.equal(JSON.stringify(data.value).includes(profile.value.cvText), false);
      assert.equal(calls, 1);
    });
    await t.test("pasted CV text clears obsolete filename and allows a subsequent first upload", async () => {
      assert.ok((await saveProfile({ cvText: "Fictional pasted CV", preferences: ["Other"] })).ok);
      const profile = await getProfile(); assert.ok(profile.ok && profile.value); assert.equal(profile.value.fileName, null);
      assert.ok((await uploadCv(new File(["Fictional TXT CV"], "new-cv.txt"))).ok);
      assert.equal(calls, 1);
    });
  } finally {
    closeDatabase();
    for (const [key, value] of [["DATABASE_PATH", previous.path], ["OPENROUTER_API_KEY", previous.key], ["OPENROUTER_MODEL", previous.model]] as const) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    rmSync(directory, { recursive: true, force: true });
  }
});
