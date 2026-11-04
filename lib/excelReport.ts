import * as XLSX from 'xlsx';
import type { WorkBook } from 'xlsx';
import type { Cell, Fill, Workbook } from 'exceljs';

const colors = { navy: 'FF183444', teal: 'FF16766A', ink: 'FF273D4A', muted: 'FF687F8D', line: 'FFE1EAF0', stripe: 'FFF2F7FA', white: 'FFFFFFFF' };
const fill = (argb: string): Fill => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
const pending = new Set<string>();

const MAX_ROW_HEIGHT = 409.5;
const FONT_SIZE = 11;
const CELL_PADDING_PX = 26;
const widthToPixels = (width: number) => Math.floor(width * 7 + 5);
const pixelsToWidth = (pixels: number) => Math.ceil((pixels - 5) / 7 * 100) / 100;

/** Measure the actual export font in the browser; Node-only checks use a conservative fallback. */
function textMeasurer() {
  const canvas = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null;
  const cache = new Map<string, number>();
  return (text: string, size = FONT_SIZE, bold = false) => {
    const key = `${size}:${bold}:${text}`;
    const cached = cache.get(key);
    if (cached !== undefined) return cached;
    let width: number;
    if (canvas) {
      canvas.font = `${bold ? 'bold ' : ''}${size}pt Calibri, Arial, sans-serif`;
      width = canvas.measureText(text).width;
    } else {
      width = Array.from(text).reduce((sum, char) => sum + (
        /\p{Mark}/u.test(char) ? 0 : /[\u0980-\u09ff\u2e80-\uffff]/u.test(char) ? 12 :
          /[MW@%&#]/.test(char) ? 12 : /[ilI.,:;'!|\s]/.test(char) ? 4 : 8
      ), 0) * (size / FONT_SIZE) * (bold ? 1.08 : 1);
    }
    // Excel and installed fallback fonts can differ slightly from browser metrics.
    width = Math.ceil(width * 1.08);
    if (cache.size >= 20000) cache.clear();
    cache.set(key, width);
    return width;
  };
}

function displayText(cell: Cell): string {
  if (cell.value instanceof Date) {
    const date = cell.value;
    return `${String(date.getUTCDate()).padStart(2, '0')} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getUTCMonth()]} ${date.getUTCFullYear()}`;
  }
  if (typeof cell.value === 'number' && cell.numFmt && cell.numFmt !== 'General') {
    try {
      const formats = XLSX.SSF || Reflect.get(XLSX, 'default')?.SSF;
      return formats.format(cell.numFmt, cell.value);
    } catch { /* Keep original numeric text. */ }
  }
  return cell.text.replace(/\r\n?/g, '\n');
}

/** Word-aware wrapping, including explicit newlines and long unbroken identifiers. */
function wrappedLines(text: string, available: number, measure: (text: string) => number): number {
  let total = 0;
  for (const paragraph of text.split('\n')) {
    let current = '';
    let lines = 1;
    for (const word of paragraph.match(/\s+|\S+/g) || []) {
      // Preserve pasted spacing when measuring; collapsing it underestimated
      // actual wrapping in otherwise short descriptions.
      if (/^\s+$/.test(word)) { current += word; continue; }
      const candidate = current + word;
      if (measure(candidate) <= available) { current = candidate; continue; }
      if (measure(word) <= available) { if (current) lines++; current = word; continue; }
      if (current) { lines++; current = ''; }
      const characters = typeof Intl.Segmenter === 'function'
        ? Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(word), item => item.segment)
        : Array.from(word);
      for (const character of characters) {
        if (current && measure(current + character) > available) { lines++; current = character; }
        else current += character;
      }
    }
    total += lines;
  }
  return Math.max(1, total);
}

/** Keeps existing sheets/data; only report tables receive a four-row presentation header. */
export async function createStyledReport(source: WorkBook, options: { template?: boolean } = {}): Promise<Workbook> {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.default.Workbook();
  await workbook.xlsx.load(XLSX.write(source, { type: 'array', bookType: 'xlsx' }));
  workbook.creator = 'Issue Tracker';
  workbook.created = new Date();
  workbook.calcProperties.fullCalcOnLoad = true;
  const generated = new Date().toLocaleString('en-GB');
  const measure = textMeasurer();

  for (const sheet of workbook.worksheets) {
    const firstRowValues = Object.values(sheet.getRow(1).values).filter(value => value !== '' && value != null);
    const summary = /summary/i.test(sheet.name) && firstRowValues.length === 1;
    const columnCount = Math.max(sheet.columnCount, 2);
    const originalRows = sheet.rowCount;
    const hasFormulas = Object.values(source.Sheets[sheet.name]).some(cell => cell && typeof cell === 'object' && 'f' in cell);
    const banner = !summary && !options.template && !hasFormulas;
    if (banner) sheet.insertRows(1, [[sheet.name], [`Issue Tracker · Generated ${generated}`], [`${Math.max(0, originalRows - 1).toLocaleString('en-GB')} records`], []]);
    const headerRow = banner ? 5 : 1;
    sheet.properties.tabColor = { argb: summary ? colors.navy : colors.teal };
    sheet.views = [{ state: 'frozen', ySplit: summary ? 1 : headerRow, xSplit: summary ? 0 : 1, showGridLines: false, zoomScale: 90 }];
    sheet.pageSetup = { paperSize: 9, orientation: columnCount > 5 ? 'landscape' : 'portrait', fitToPage: true, fitToWidth: columnCount > 10 ? 0 : 1, fitToHeight: 0, horizontalCentered: true, margins: { left: .3, right: .3, top: .5, bottom: .5, header: .2, footer: .2 }, printTitlesRow: summary ? '1:1' : `${headerRow}:${headerRow}` };
    sheet.headerFooter = { oddFooter: '&LIssue Tracker&C' + sheet.name.replaceAll('&', '&&') + '&RPage &P of &N' };

    const headings = Array.from({ length: columnCount }, (_, index) => String(sheet.getCell(headerRow, index + 1).value ?? '').replace(/\s+/g, ' ').trim());
    if (!summary) headings.forEach((heading, index) => { sheet.getCell(headerRow, index + 1).value = heading; });
    const narrativeColumns = headings.map(heading => !summary && /details|description|findings|notes|comments?|reason|address|products|items|all issues/i.test(heading));
    const summarySections = new Set<number>();
    if (summary) {
      sheet.eachRow((row, index) => {
        const first = String(row.getCell(1).value || '');
        if (index === 1 || (first.length > 2 && first === first.toUpperCase() && /[A-Z]/.test(first))) {
          summarySections.add(index);
          if (columnCount > 1 && !row.getCell(1).isMerged && Array.from({ length: columnCount - 1 }, (_, c) => row.getCell(c + 2).value).every(value => value === null || value === '')) sheet.mergeCells(index, 1, index, columnCount);
        }
      });
    }
    sheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      for (let column = 1; column <= columnCount; column++) {
        const cell = row.getCell(column);
        if (cell.isMerged && cell.master.address !== cell.address) continue;
        cell.font = { name: 'Calibri', size: 11, color: { argb: colors.ink } };
        cell.fill = fill(rowNumber % 2 ? colors.white : colors.stripe);
        const edge = { style: 'thin' as const, color: { argb: colors.line } };
        cell.border = { top: edge, bottom: edge, left: edge, right: edge };
        if (typeof cell.value === 'number' && (!cell.numFmt || cell.numFmt === 'General')) cell.numFmt = Number.isInteger(cell.value) ? '#,##0' : '#,##0.00';
        if (typeof cell.value === 'string' && /^-?\d+(\.\d+)?%$/.test(cell.value)) { cell.value = parseFloat(cell.value) / 100; cell.numFmt = '0.0%'; }
        const heading = headings[column - 1];
        if (!summary && rowNumber > headerRow && /date/i.test(heading) && typeof cell.value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(cell.value)) { cell.value = new Date(`${cell.value}T00:00:00Z`); cell.numFmt = 'dd mmm yyyy'; }
        if (cell.value instanceof Date) cell.numFmt = 'dd mmm yyyy';
        if (!summary && rowNumber > headerRow && /(?:revenue|amount|price|value|mrr|billing|paid|due|bdt)/i.test(heading) && typeof cell.value === 'number') cell.numFmt = '"৳" #,##0.00';
        const wrap = rowNumber > headerRow && (narrativeColumns[column - 1] || displayText(cell).includes('\n'));
        cell.alignment = { vertical: rowNumber === headerRow ? 'middle' : 'top', horizontal: typeof cell.value === 'number' ? 'right' : 'left', wrapText: wrap, shrinkToFit: false, indent: 1 };
        if (rowNumber > headerRow) styleStatus(cell);
      }
      if (!summary && rowNumber === headerRow) {
        row.eachCell({ includeEmpty: true }, cell => { cell.fill = fill(colors.teal); cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: colors.white } }; });
      }
      if (summary) {
        if (summarySections.has(rowNumber)) { row.eachCell({ includeEmpty: true }, cell => { cell.fill = fill(rowNumber === 1 ? colors.navy : colors.teal); cell.font = { name: 'Calibri', size: rowNumber === 1 ? 16 : 11, bold: true, color: { argb: colors.white } }; }); }
        else if (rowNumber > 3) row.getCell(2).font = { name: 'Calibri', size: 12, bold: true, color: { argb: colors.teal } };
        if (row.getCell(1).isMerged) row.getCell(1).alignment = { ...row.getCell(1).alignment, wrapText: true };
      }
    });

    // Widths use formatted values, not raw dates, character counts or narrow presets.
    for (let column = 1; column <= columnCount; column++) {
      const originalWidth = source.Sheets[sheet.name]['!cols']?.[column - 1]?.wch || 0;
      let naturalPixels = measure(headings[column - 1], FONT_SIZE, true) + CELL_PADDING_PX + 20;
      if (summary) naturalPixels = 0; // Summary title/section spans must not inflate a single column.
      sheet.eachRow((row, index) => {
        if (index < headerRow || (summary && summarySections.has(index))) return;
        const cell = row.getCell(column);
        if (cell.isMerged) return;
        const textWidth = Math.max(0, ...displayText(cell).split('\n').map(text => measure(text, cell.font.size || FONT_SIZE, !!cell.font.bold)));
        naturalPixels = Math.max(naturalPixels, textWidth + CELL_PADDING_PX);
      });
      const headingWidth = pixelsToWidth(measure(headings[column - 1], FONT_SIZE, true) + CELL_PADDING_PX + 20);
      const width = narrativeColumns[column - 1]
        ? Math.max(headingWidth, Math.min(100, Math.max(60, originalWidth)))
        : Math.max(summary ? (column === 1 ? 38 : 28) : 14, originalWidth, pixelsToWidth(naturalPixels));
      sheet.getColumn(column).width = Math.min(255, width);

      // Expand long narrative fields before reaching Excel's maximum row height.
      if (narrativeColumns[column - 1]) {
        const maxLines = Math.floor((MAX_ROW_HEIGHT - 12) / (FONT_SIZE * 1.4));
        sheet.eachRow((row, index) => {
          if (index <= headerRow) return;
          const cell = row.getCell(column);
          if (typeof cell.value !== 'string' || cell.value.split('\n').length <= maxLines) return;
          // Pasted hard wraps can exceed Excel's physical height limit even at
          // maximum width. Reflow those into paragraphs, retaining every word.
          const paragraphs = cell.value.replace(/\r\n?/g, '\n').split(/\n[ \t]*\n+/)
            .map(paragraph => paragraph.replace(/[ \t]*\n[ \t]*/g, ' ').trim()).filter(Boolean);
          const reflowed = paragraphs.join('\n\n');
          cell.value = reflowed.split('\n').length > maxLines ? paragraphs.join(' ') : reflowed;
        });
        let required = 0;
        const heightAtWidth = () => {
          required = 0;
          sheet.eachRow((row, index) => {
            if (index <= headerRow) return;
            const text = displayText(row.getCell(column));
            required = Math.max(required, wrappedLines(text, widthToPixels(sheet.getColumn(column).width!) - CELL_PADDING_PX, value => measure(value)) * FONT_SIZE * 1.4 + 12);
          });
        };
        heightAtWidth();
        while (required > MAX_ROW_HEIGHT && sheet.getColumn(column).width! < 255) {
          sheet.getColumn(column).width = Math.min(255, Math.ceil(sheet.getColumn(column).width! * 1.25));
          heightAtWidth();
        }
      }
    }

    // Every header stays on one line; only narrative/multiline cells wrap.
    sheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      if (banner && rowNumber < headerRow) return;
      let height = rowNumber === headerRow && !summary ? 36 : 30;
      for (let column = 1; column <= columnCount; column++) {
        const cell = row.getCell(column);
        if (cell.isMerged && cell.master.address !== cell.address) continue;
        let width = widthToPixels(sheet.getColumn(column).width!);
        if (cell.isMerged) width = sheet.columns.reduce((sum, item) => sum + widthToPixels(item.width || 14), 0);
        const text = displayText(cell);
        if (cell.alignment.wrapText) {
          const lines = wrappedLines(text, width - CELL_PADDING_PX, value => measure(value, cell.font.size || FONT_SIZE, !!cell.font.bold));
          height = Math.max(height, lines * (cell.font.size || FONT_SIZE) * 1.4 + 12);
        } else if (measure(text, cell.font.size || FONT_SIZE, !!cell.font.bold) > width - CELL_PADDING_PX) {
          cell.alignment = { ...cell.alignment, shrinkToFit: true };
        }
      }
      row.height = Math.min(MAX_ROW_HEIGHT, Math.ceil(height));
    });
    if (banner) {
      for (const row of [1, 2, 3]) {
        sheet.mergeCells(row, 1, row, columnCount);
        const cell = sheet.getCell(row, 1);
        cell.fill = fill(colors.navy);
        cell.font = { name: 'Calibri', size: row === 1 ? 22 : 11, bold: row !== 2, color: { argb: row === 2 ? 'FFB5D1DA' : colors.white } };
        cell.border = {};
        cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true, indent: 1 };
        const available = sheet.columns.reduce((sum, item) => sum + widthToPixels(item.width || 14), 0) - CELL_PADDING_PX;
        const lines = wrappedLines(cell.text, available, value => measure(value, cell.font.size, !!cell.font.bold));
        sheet.getRow(row).height = Math.max(row === 1 ? 44 : 25, Math.ceil(lines * cell.font.size! * 1.4 + 10));
      }
      sheet.getRow(4).height = 12;
    }
    if (!summary && sheet.rowCount >= headerRow) sheet.autoFilter = { from: { row: headerRow, column: 1 }, to: { row: sheet.rowCount, column: columnCount } };
    sheet.pageSetup.printArea = `A1:${sheet.getCell(sheet.rowCount || 1, columnCount).address}`;
  }
  return workbook;
}

function styleStatus(cell: Cell) {
  if (typeof cell.value !== 'string') return;
  const status = cell.value.trim().toLowerCase();
  const palette = /^(closed|done|resolved|yes|excellent|good|healthy|paid|active)$/.test(status) ? ['FFE3F3ED', 'FF167052']
    : /^(open|pending|medium|average|at risk|partial)$/.test(status) ? ['FFFFF2D6', 'FF98600D']
    : /^(no|critical|urgent|high|very poor|poor|churned|unpaid)$/.test(status) ? ['FFFCE7EB', 'FFAC304B'] : null;
  if (palette) { cell.fill = fill(palette[0]); cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: palette[1] } }; }
}

export function downloadStyledReport(source: WorkBook, filename: string, options: { template?: boolean } = {}): void {
  if (pending.has(filename)) return;
  pending.add(filename);
  void createStyledReport(source, options).then(workbook => workbook.xlsx.writeBuffer()).then(buffer => {
    const blob = new Blob([buffer as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = filename; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }).catch(error => { console.error('Excel export failed:', error); window.alert('Excel report তৈরি করা যায়নি। আবার চেষ্টা করুন।'); }).finally(() => pending.delete(filename));
}
