import "server-only";
import { PDFParse } from "pdf-parse";
import { getPath } from "pdf-parse/worker";
import mammoth from "mammoth";
import type { Profile, Result } from "../shared/contracts.ts";
import { getProfile, saveProfile } from "./profile.ts";
import { failure } from "./results.ts";

export const MAX_CV_FILE_BYTES = 5 * 1024 * 1024;

// Extraction stays on this machine. No file URLs, HTML, or provider requests.
export async function uploadCv(file: File): Promise<Result<Profile>> {
  if (!(file instanceof File) || !file.size) return failure("VALIDATION", "Choose a non-empty CV file.");
  if (file.size > MAX_CV_FILE_BYTES) return failure("VALIDATION", "Your CV file must be 5 MB or smaller.");
  if (!file.name.trim() || file.name.length > 180 || /[\x00-\x1f/\\]/.test(file.name)) return failure("VALIDATION", "Use a filename of 180 characters or fewer, without path characters.");
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!extension || !["pdf", "docx", "txt"].includes(extension)) return failure("VALIDATION", "Choose a PDF, DOCX or UTF-8 TXT file.");
  let cvText: string;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    if (extension === "pdf") {
      if (!buffer.subarray(0, 1024).includes(Buffer.from("%PDF-"))) return failure("VALIDATION", "This file is not a valid PDF.");
      PDFParse.setWorker(getPath());
      const parser = new PDFParse({ data: buffer, verbosity: 0 });
      try {
        const result = await parser.getText({ pageJoiner: "" });
        cvText = result.text;
      } finally { await parser.destroy(); }
    } else if (extension === "docx") {
      if (buffer[0] !== 0x50 || buffer[1] !== 0x4b) return failure("VALIDATION", "This file is not a valid DOCX document.");
      cvText = (await mammoth.extractRawText({ buffer })).value;
    } else {
      cvText = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
      if (/\x00/.test(cvText)) return failure("VALIDATION", "Choose a plain UTF-8 text file.");
    }
  } catch {
    return failure("VALIDATION", "We couldn't read this CV. Try an unlocked text-based PDF, DOCX or UTF-8 TXT file.");
  }
  cvText = cvText.trim().replace(/\r\n?/g, "\n");
  if (!cvText) return failure("VALIDATION", "No readable text was found. For a scanned PDF, export a text-based PDF or TXT version.");
  if (cvText.length > 12000) return failure("VALIDATION", "The extracted CV is over 12,000 characters. Please upload a shorter version.");
  const existing = await getProfile();
  if (!existing.ok) return existing;
  return saveProfile({ cvText, preferences: existing.value?.preferences ?? ["Technology"], fileName: file.name });
}
