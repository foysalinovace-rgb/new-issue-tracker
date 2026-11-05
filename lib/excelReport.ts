import * as XLSX from 'xlsx';
import type { WorkBook } from 'xlsx';
import type { Cell, Fill, Workbook } from 'exceljs';

const colors = {
  navy: 'FF1E293B',    // Slate 800 - professional dark header
  teal: 'FF0F766E',    // Deep Teal 700 - brand primary
  ink: 'FF1E293B',     // Text color
  muted: 'FF64748B',   // Muted subtitle
  line: 'FFE2E8F0',    // Light slate border
  stripe: 'FFF8FAFC',  // Subtle alternate row zebra
  white: 'FFFFFFFF',
  // Status pill colors
  successBg: 'FFDCFCE7', successText: 'FF166534',
  warningBg: 'FFFEF3C7', warningText: 'FF92400E',
  dangerBg: 'FFFEE2E2',  dangerText: 'FF991B1B',
  infoBg: 'FFE0F2FE',    infoText: 'FF075985',
};

const fill = (argb: string): Fill => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
const pending = new Set<string>();

const MAX_ROW_HEIGHT = 280;
const FONT_SIZE = 11;

/** Estimate character width taking into account CJK, Bengali glyphs, uppercase, and digits */
function estimateTextWidth(text: string): number {
  if (!text) return 0;
  let len = 0;
  for (const char of text) {
    if (/[\u0980-\u09ff]/.test(char)) {
      len += 1.4; // Bengali character
    } else if (/[A-Z0-9@#%&MW]/.test(char)) {
      len += 1.15;
    } else if (/[ilI.,:;'!| ]/.test(char)) {
      len += 0.55;
    } else {
      len += 0.95;
    }
  }
  return len;
}

function displayText(cell: Cell): string {
  if (cell.value == null) return '';
  if (cell.value instanceof Date) {
    const date = cell.value;
    return `${String(date.getUTCDate()).padStart(2, '0')}-${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getUTCMonth()]}-${date.getUTCFullYear()}`;
  }
  if (typeof cell.value === 'number' && cell.numFmt && cell.numFmt !== 'General') {
    try {
      const formats = XLSX.SSF || Reflect.get(XLSX, 'default')?.SSF;
      return formats.format(cell.numFmt, cell.value);
    } catch { /* Keep original numeric text */ }
  }
  return String(cell.text || '').replace(/\r\n?/g, '\n');
}

export async function createStyledReport(source: WorkBook, options: { template?: boolean } = {}): Promise<Workbook> {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.default.Workbook();
  await workbook.xlsx.load(XLSX.write(source, { type: 'array', bookType: 'xlsx' }));
  workbook.creator = 'Inovace Technologies Ltd.';
  workbook.created = new Date();
  workbook.calcProperties.fullCalcOnLoad = true;

  for (const sheet of workbook.worksheets) {
    const columnCount = Math.max(sheet.columnCount, 2);
    const summary = /summary/i.test(sheet.name);

    // Modern clean format: Table headers start directly at Row 1
    // (No disruptive merged banner rows that break sorting, filtering, or row selection in Excel)
    const headerRow = 1;

    // Freeze top header row and keep native Excel gridlines visible
    sheet.views = [
      {
        state: 'frozen',
        ySplit: headerRow,
        xSplit: 0,
        showGridLines: true, // Crisp row and column gridlines
        zoomScale: 100,      // Natural 100% zoom
      }
    ];

    sheet.properties.tabColor = { argb: colors.teal };
    sheet.pageSetup = {
      paperSize: 9,
      orientation: columnCount > 6 ? 'landscape' : 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      horizontalCentered: true,
      margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
      printTitlesRow: '1:1'
    };
    sheet.headerFooter = {
      oddHeader: `&L&BInovace Technologies Ltd.&R&B${sheet.name.replaceAll('&', '&&')}`,
      oddFooter: `&LConfidential&CPage &P of &N&R${new Date().toLocaleDateString('en-GB')}`
    };

    // Extract Headings
    const headings: string[] = [];
    for (let c = 1; c <= columnCount; c++) {
      headings.push(String(sheet.getCell(headerRow, c).value ?? '').replace(/\s+/g, ' ').trim());
    }

    const narrativeColumns = headings.map(heading =>
      /details|description|findings|notes|comments?|reason|address|products summary|items|all issues/i.test(heading)
    );

    // Compute generous column widths to ensure NO text is clipped and NO cell needs manual resizing
    const colMaxWidths = new Array<number>(columnCount).fill(12);

    for (let col = 1; col <= columnCount; col++) {
      const heading = headings[col - 1] || '';
      const isNarrative = narrativeColumns[col - 1];

      // Header width requires extra padding for the Excel AutoFilter dropdown button (+6 chars)
      let maxCharWidth = Math.ceil(estimateTextWidth(heading) + 6);

      if (isNarrative) {
        // Generous, comfortable paragraph width for narrative/details
        colMaxWidths[col - 1] = Math.max(maxCharWidth, 55);
        continue;
      }

      sheet.eachRow((row, rowNumber) => {
        if (rowNumber <= headerRow) return;
        const cell = row.getCell(col);
        if (cell.isMerged) return;
        const text = displayText(cell);
        if (!text) return;

        // Split multi-line cells and measure max line width
        const lines = text.split('\n');
        for (const line of lines) {
          const w = Math.ceil(estimateTextWidth(line) + 4);
          if (w > maxCharWidth) maxCharWidth = w;
        }
      });

      // Practical category minimums so numbers, dates and names have breathing space
      let minW = 14;
      if (/^sl\b|^#\b|^id\b/i.test(heading)) minW = 10;
      else if (/date|time/i.test(heading)) minW = 16;
      else if (/client|company|customer/i.test(heading)) minW = 30;
      else if (/assigned|person|handler|rep|sold by|called by/i.test(heading)) minW = 24;
      else if (/satisfaction|rating|resolved/i.test(heading)) minW = 20;
      else if (/fee|price|revenue|amount|value|mrr|discount/i.test(heading)) minW = 18;
      else if (/status|priority|category|segment|type/i.test(heading)) minW = 18;

      colMaxWidths[col - 1] = Math.max(minW, Math.min(65, maxCharWidth));
    }

    // Apply auto-fitted column widths
    for (let col = 1; col <= columnCount; col++) {
      sheet.getColumn(col).width = colMaxWidths[col - 1];
    }

    // Set Header Row Height (clean, comfortable, professional)
    sheet.getRow(headerRow).height = 28;

    // Format all cells and borders
    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      const isHeader = rowNumber === headerRow;

      // DO NOT set custom row height on data rows!
      // When row.height is left undefined, Microsoft Excel and all spreadsheet engines
      // automatically calculate the exact, perfect pixel height for every row to fit all text!
      if (!isHeader) {
        delete (row as any).height;
      }

      for (let col = 1; col <= columnCount; col++) {
        const cell = row.getCell(col);
        if (cell.isMerged && cell.master.address !== cell.address) continue;

        const heading = headings[col - 1] || '';
        const isNarrative = narrativeColumns[col - 1];
        const isNumeric = typeof cell.value === 'number';
        const isDateCol = /date/i.test(heading);
        const isMoneyCol = /(?:revenue|amount|price|fee|value|mrr|billing|paid|due|bdt|discount)/i.test(heading);
        const isCenterCol = /^sl\b|^#\b|status|priority|rating|resolved/i.test(heading);

        // Crisp, visible Slate 300 border so every row line is clearly demarcated
        const edge = { style: 'thin' as const, color: { argb: 'FFCBD5E1' } };
        cell.border = { top: edge, bottom: edge, left: edge, right: edge };

        if (isHeader) {
          cell.fill = fill(colors.teal);
          cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: colors.white } };
          cell.alignment = {
            vertical: 'middle',
            horizontal: isNumeric ? 'right' : isCenterCol ? 'center' : 'left',
            wrapText: false,
          };
        } else {
          // Data Row: subtle alternating zebra striping
          const isAlternate = rowNumber % 2 === 0;
          cell.fill = fill(isAlternate ? colors.stripe : colors.white);
          cell.font = { name: 'Calibri', size: 10.5, color: { argb: colors.ink } };

          // Format dates
          if (isDateCol && typeof cell.value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(cell.value)) {
            const dateVal = new Date(cell.value);
            if (!isNaN(dateVal.getTime())) {
              cell.value = dateVal;
              cell.numFmt = 'dd-mmm-yyyy';
            }
          } else if (cell.value instanceof Date) {
            cell.numFmt = 'dd-mmm-yyyy';
          }

          // Format currency
          if (isMoneyCol && isNumeric) {
            cell.numFmt = '"৳" #,##0.00';
          } else if (isNumeric && (!cell.numFmt || cell.numFmt === 'General')) {
            cell.numFmt = Number.isInteger(cell.value) ? '#,##0' : '#,##0.00';
          }

          // Format percentages
          if (typeof cell.value === 'string' && /^-?\d+(\.\d+)?%$/.test(cell.value)) {
            cell.value = parseFloat(cell.value) / 100;
            cell.numFmt = '0.0%';
          }

          // Text alignment and wrapping
          const text = displayText(cell);
          const shouldWrap = isNarrative || text.includes('\n');

          cell.alignment = {
            vertical: shouldWrap ? 'top' : 'middle',
            horizontal: isNumeric ? 'right' : isCenterCol ? 'center' : 'left',
            wrapText: shouldWrap,
          };

          // Soft Status pill styling
          styleStatus(cell);
        }
      }
    });

    // AutoFilter on the table headers (Row 1)
    if (!summary && sheet.rowCount >= headerRow) {
      sheet.autoFilter = {
        from: { row: headerRow, column: 1 },
        to: { row: sheet.rowCount, column: columnCount }
      };
    }
  }

  return workbook;
}

/** Status and state badges with executive soft backgrounds */
function styleStatus(cell: Cell) {
  if (typeof cell.value !== 'string') return;
  const status = cell.value.trim().toLowerCase();

  // Success green
  if (/^(closed|done|resolved|yes|excellent|good|satisfied|active|paid|healthy)$/.test(status)) {
    cell.fill = fill(colors.successBg);
    cell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: colors.successText } };
    cell.alignment = { ...cell.alignment, horizontal: 'center' };
  }
  // Warning amber
  else if (/^(open|pending|medium|average|neutral|at risk|partial|in progress)$/.test(status)) {
    cell.fill = fill(colors.warningBg);
    cell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: colors.warningText } };
    cell.alignment = { ...cell.alignment, horizontal: 'center' };
  }
  // Danger red
  else if (/^(no|critical|urgent|high|very poor|poor|dissatisfied|churned|unpaid)$/.test(status)) {
    cell.fill = fill(colors.dangerBg);
    cell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: colors.dangerText } };
    cell.alignment = { ...cell.alignment, horizontal: 'center' };
  }
  // Rating 5 or 4
  else if (/^[45]\b/.test(status)) {
    cell.fill = fill(colors.successBg);
    cell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: colors.successText } };
    cell.alignment = { ...cell.alignment, horizontal: 'center' };
  }
  // Rating 3
  else if (/^3\b/.test(status)) {
    cell.fill = fill(colors.warningBg);
    cell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: colors.warningText } };
    cell.alignment = { ...cell.alignment, horizontal: 'center' };
  }
  // Rating 1 or 2
  else if (/^[12]\b/.test(status)) {
    cell.fill = fill(colors.dangerBg);
    cell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: colors.dangerText } };
    cell.alignment = { ...cell.alignment, horizontal: 'center' };
  }
}

export function downloadStyledReport(source: WorkBook, filename: string, options: { template?: boolean } = {}): void {
  if (pending.has(filename)) return;
  pending.add(filename);
  void createStyledReport(source, options)
    .then(workbook => workbook.xlsx.writeBuffer())
    .then(buffer => {
      const blob = new Blob([buffer as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    })
    .catch(error => {
      console.error('Excel export failed:', error);
      window.alert('Excel report তৈরি করা যায়নি। আবার চেষ্টা করুন।');
    })
    .finally(() => pending.delete(filename));
}

