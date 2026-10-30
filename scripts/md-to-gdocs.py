#!/usr/bin/env python3
"""Convert docs/technical-report.md into an HTML file that can be opened in a
browser and pasted into Google Docs with headings/tables/bold preserved."""
import html
import re
import sys
from pathlib import Path

SRC = Path(__file__).resolve().parent.parent / "docs" / "technical-report.md"
DST = Path(__file__).resolve().parent.parent / "docs" / "technical-report.html"


def inline(text: str) -> str:
    text = html.escape(text, quote=False)
    text = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"`(.+?)`", r"<code>\1</code>", text)
    text = re.sub(
        r"(https?://[^\s<)]+)", r'<a href="\1">\1</a>', text
    )
    return text


def main() -> None:
    lines = SRC.read_text(encoding="utf-8").splitlines()
    out: list[str] = []
    i = 0
    paragraph: list[str] = []

    def flush_paragraph() -> None:
        if paragraph:
            out.append("<p>" + inline(" ".join(paragraph)) + "</p>")
            paragraph.clear()

    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        if stripped.startswith("|"):
            flush_paragraph()
            block: list[str] = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                block.append(lines[i].strip())
                i += 1
            rows = []
            for row in block:
                if re.match(r"^\|[\s:|-]+\|$", row):
                    continue  # separator row
                cells = [c.strip() for c in row.strip("|").split("|")]
                rows.append(cells)
            out.append("<table border='1' cellspacing='0' cellpadding='6'>")
            for idx, cells in enumerate(rows):
                tag = "th" if idx == 0 else "td"
                out.append(
                    "<tr>"
                    + "".join(f"<{tag}>{inline(c)}</{tag}>" for c in cells)
                    + "</tr>"
                )
            out.append("</table>")
            continue

        if stripped.startswith("# "):
            flush_paragraph()
            out.append(f"<h1>{inline(stripped[2:])}</h1>")
        elif stripped.startswith("## "):
            flush_paragraph()
            out.append(f"<h2>{inline(stripped[3:])}</h2>")
        elif stripped.startswith("### "):
            flush_paragraph()
            out.append(f"<h3>{inline(stripped[4:])}</h3>")
        elif stripped.startswith("---") and set(stripped) == {"-"}:
            flush_paragraph()
            out.append("<hr>")
        elif stripped.startswith("*") and stripped.endswith("*") and not stripped.startswith("**"):
            flush_paragraph()
            out.append(f"<p><em>{inline(stripped.strip('*'))}</em></p>")
        elif stripped == "":
            flush_paragraph()
        else:
            paragraph.append(stripped)
        i += 1

    flush_paragraph()

    doc = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Imari — Technical Report</title>
<style>
  body {{ font-family: Arial, Helvetica, sans-serif; font-size: 11pt; line-height: 1.45;
         max-width: 800px; margin: 32px auto; color: #111; }}
  h1 {{ font-size: 20pt; margin-bottom: 4px; }}
  h2 {{ font-size: 15pt; margin-top: 24px; }}
  h3 {{ font-size: 12.5pt; margin-top: 18px; }}
  table {{ border-collapse: collapse; width: 100%; margin: 10px 0; font-size: 9.5pt; }}
  th {{ background: #f2f2f2; text-align: left; }}
  td, th {{ border: 1px solid #999; vertical-align: top; padding: 5px 7px; }}
  code {{ background: #f5f5f5; padding: 1px 4px; font-family: Menlo, monospace; font-size: 9.5pt; }}
  hr {{ border: none; border-top: 1px solid #ccc; margin: 22px 0; }}
  p {{ margin: 8px 0; }}
</style>
</head>
<body>
{chr(10).join(out)}
</body>
</html>
"""
    DST.write_text(doc, encoding="utf-8")
    print(f"wrote {DST} ({len(doc)} chars)")


if __name__ == "__main__":
    sys.exit(main())
