"""Fill a flat (non-fillable) PDF form by overlaying text from a YAML data file.

Usage:
    python tools/pdf-overlay/fill.py <layout.yaml> <data.yaml> [-o out.pdf] [--preview]

layout.yaml  describes WHERE things go on one specific form (written once per form).
data.yaml    holds WHAT goes in (one per event). Any value containing "TODO" is
             reported as missing.

Layout field types:
  text   {page, x, y, w, [size], [template]}   one line; whites out w points of dotted leader
  check  {page, x, y}                          draws an X on a checkbox when the data value is true
  lines  {page, x, y, w, leading, max_lines}   wrapped paragraph over several dotted lines
`template` may reference several data keys, e.g. "Du {date_debut} au {date_fin}".

A top-level `appendix` key in the data (title, intro, columns, rows) adds an extra page,
e.g. the programme for a Sacem declaration.
"""

import argparse
import io
import re
import sys
from pathlib import Path

import yaml
from pypdf import PdfReader, PdfWriter
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.utils import simpleSplit
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

INK = colors.HexColor("#1a2a6c")  # dark blue, reads as "filled in by hand"
FONT = "Helvetica"


def keys_in(template):
    return re.findall(r"{(\w+)}", template)


def overlay_page(width, height, fields, data, page_no, problems):
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=(width, height))
    for name, f in fields.items():
        if f.get("page", 0) != page_no:
            continue
        kind = f.get("type", "text")
        if kind == "check":
            if data.get(name) is True:
                c.setFillColor(INK)
                c.setFont("Helvetica-Bold", 10)
                c.drawString(f["x"] + 1.4, f["y"] + 0.6, "X")
            continue

        template = f.get("template", "{%s}" % name)
        needed = keys_in(template)
        if not any(data.get(k) not in (None, "") for k in needed):
            continue
        text = template.format(**{k: str(data.get(k, "") or "") for k in needed}).strip()
        size = f.get("size", 10)

        if kind == "text":
            lines = [text]
        else:  # lines
            while True:
                lines = simpleSplit(text, FONT, size, f["w"])
                if len(lines) <= f["max_lines"] or size <= 7:
                    break
                size -= 0.5
            if len(lines) > f["max_lines"]:
                problems.append(f"{name}: text too long ({len(lines)} lines, max {f['max_lines']})")
                lines = lines[: f["max_lines"]]
        if simpleSplit(lines[0], FONT, size, f["w"]) != [lines[0]] and kind == "text":
            problems.append(f"{name}: text wider than the field")

        leading = f.get("leading", 0)
        for i, line in enumerate(lines):
            y = f["y"] - i * leading
            c.setFillColor(colors.white)
            c.rect(f["x"] - 1, y - 3, f["w"] + 2, 11.5, stroke=0, fill=1)
            c.setFillColor(INK)
            c.setFont(FONT, size)
            c.drawString(f["x"], y, line)
    c.save()
    buf.seek(0)
    return PdfReader(buf).pages[0]


def appendix_pdf(spec):
    buf = io.BytesIO()
    styles = getSampleStyleSheet()
    story = [Paragraph(spec["title"], styles["Title"])]
    if spec.get("intro"):
        story += [Paragraph(spec["intro"], styles["Normal"]), Spacer(1, 12)]
    rows = [spec["columns"]] + spec["rows"]
    table = Table(rows, hAlign="LEFT", colWidths=spec.get("col_widths"))
    table.setStyle(TableStyle([
        ("FONT", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("LINEBELOW", (0, 0), (-1, 0), 0.8, colors.black),
        ("GRID", (0, 1), (-1, -1), 0.25, colors.grey),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(table)
    if spec.get("outro"):
        story += [Spacer(1, 12), Paragraph(spec["outro"], styles["Normal"])]
    SimpleDocTemplate(buf, pagesize=A4, leftMargin=50, rightMargin=50).build(story)
    buf.seek(0)
    return PdfReader(buf).pages


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("layout")
    ap.add_argument("data")
    ap.add_argument("-o", "--out")
    ap.add_argument("--preview", action="store_true", help="also write one PNG per page")
    args = ap.parse_args()

    layout_path, data_path = Path(args.layout), Path(args.data)
    layout = yaml.safe_load(layout_path.read_text(encoding="utf-8"))
    data = yaml.safe_load(data_path.read_text(encoding="utf-8"))
    out = Path(args.out) if args.out else data_path.with_suffix(".pdf")

    problems = [f"{k}: unknown field (not in layout)" for k in data
                if k not in layout["fields"] and k != "appendix"
                and not any(k in keys_in(f.get("template", "")) for f in layout["fields"].values())]
    problems += [f"{k}: still TODO" for k, v in data.items() if isinstance(v, str) and "TODO" in v]

    writer = PdfWriter(clone_from=layout_path.parent / layout["pdf"])
    for i, page in enumerate(writer.pages):
        box = page.mediabox
        page.merge_page(overlay_page(float(box.width), float(box.height),
                                     layout["fields"], data, i, problems))
    if data.get("appendix"):
        for p in appendix_pdf(data["appendix"]):
            writer.add_page(p)
    with open(out, "wb") as fh:
        writer.write(fh)
    print(f"wrote {out}")

    if args.preview:
        import pypdfium2 as pdfium
        doc = pdfium.PdfDocument(str(out))
        for i in range(len(doc)):
            png = out.with_name(f"{out.stem}.p{i + 1}.png")
            doc[i].render(scale=1.5).to_pil().save(png)
            print(f"preview {png}")

    if problems:
        print("\nCheck these:", *problems, sep="\n  - ")
        sys.exit(1)


if __name__ == "__main__":
    main()
