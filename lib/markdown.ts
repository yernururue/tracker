// Tiny markdown subset for content/instructions.md: "# h1", "## h2", paragraphs.
// Lines inside a paragraph keep their breaks. No HTML is ever produced from text.

export type MdBlock =
  | { type: "h1"; text: string; id: string }
  | { type: "h2"; text: string; id: string }
  | { type: "p"; lines: string[] };

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-");
}

export function parseMarkdown(src: string): MdBlock[] {
  const blocks: MdBlock[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) blocks.push({ type: "p", lines: para });
    para = [];
  };
  for (const raw of src.split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (line.startsWith("## ")) {
      flush();
      const text = line.slice(3).trim();
      blocks.push({ type: "h2", text, id: slugify(text) });
    } else if (line.startsWith("# ")) {
      flush();
      const text = line.slice(2).trim();
      blocks.push({ type: "h1", text, id: slugify(text) });
    } else if (line.trim() === "") {
      flush();
    } else {
      para.push(line.trim());
    }
  }
  flush();
  return blocks;
}
