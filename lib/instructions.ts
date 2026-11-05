import { readFileSync } from "node:fs";
import path from "node:path";
import { parseMarkdown, type MdBlock } from "./markdown";

let cached: MdBlock[] | null = null;

export function getInstructions(): MdBlock[] {
  if (!cached) {
    cached = parseMarkdown(readFileSync(path.join(process.cwd(), "content/instructions.md"), "utf8"));
  }
  return cached;
}
