import fs from 'node:fs';
import assert from 'node:assert/strict';
import XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { chromium } from '@playwright/test';
fs.mkdirSync('artifacts/excel-layout',{recursive:true});
const source=XLSX.utils.book_new();
const headers=['Ticket ID','Client Name','Issue Date & Time','Status','Issue Details','Assigned Handler','Feedback Date','Amount (BDT)','Resolution Confirmation & Customer Feedback'];
const rows=[
 ['00000000-0000-4000-8000-000000000001','Worldwide Manufacturing and Infrastructure Solutions Limited','05 November 2026, 10:45:30 AM','Open','The customer reported an intermittent network connection. '.repeat(12),'Md. Mostafizur Rahman','2026-11-05',123456789.25],
 ['00123','বাংলাদেশ ইন্ডাস্ট্রিয়াল সলিউশনস লিমিটেড','05 November 2026, 11:30:00 AM','Closed','গ্রাহকের সমস্যাটি পরীক্ষা করে সমাধান করা হয়েছে। '.repeat(65),'Support team','2026-11-05',0],
 ['00042','Multiline notes','05 November 2026, 11:45:00 AM','Pending',Array.from({length:12},(_,i)=>`${i+1}. This complete issue description must remain inside its own cell.`).join('\n'),'Customer Success Team','2026-11-05',10000],
 ['URL-01','Unbroken reference','05 November 2026, 12:30:00 PM','Done','https://example.test/'+('verylongunbrokenreference'.repeat(80)),'Support team','2026-11-05',500]
];
rows.push(['PASTED-01','Pasted multiline notes','05 November 2026, 01:00:00 PM','Open',Array.from({length:43},(_,i)=>i%4===0?'':`Line ${i+1}: retained customer note.`).join('\n'),'Support team','2026-11-05',100]);
rows.forEach(row=>row.push('Yes, fully resolved'));
const data=XLSX.utils.aoa_to_sheet([headers,...rows]);data['!cols']=headers.map(()=>({wch:8}));XLSX.utils.book_append_sheet(source,data,'Issue Reports');
const summary=XLSX.utils.aoa_to_sheet([['CUSTOMER SATISFACTION EXECUTIVE SUMMARY',''],['Generated On','05 November 2026, 12:30:00 PM'],['Reporting Period','November 2026'],['',''],['CUSTOMER SATISFACTION AND RESOLUTION METRICS','VALUE'],['Total Issue Count',99999],['Overall CSAT Score (% Satisfied)','99.9%'],['Pending / Unresolved Issues Awaiting Customer Confirmation',1234]]);summary['!cols']=[{wch:12},{wch:10}];XLSX.utils.book_append_sheet(source,summary,'CSAT Summary');
XLSX.utils.book_append_sheet(source,XLSX.utils.aoa_to_sheet([['Client Name','Count'],['Worldwide Manufacturing and Infrastructure Solutions Limited',14]]),'Clients Summary');
XLSX.utils.book_append_sheet(source,XLSX.utils.aoa_to_sheet([['Name']]),'Empty Report With A Long Title');
XLSX.utils.book_append_sheet(source,XLSX.utils.aoa_to_sheet([['Name','Issue Details'],['Pasted spaces','Customer requested'+(' '.repeat(130))+'a configuration update.']]),'Pasted Spacing');
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext();
await context.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}));
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:900});await page.goto('http://localhost:3000/login');await page.getByRole('heading',{name:'Welcome back.'}).waitFor();
  assert.equal(await page.locator('.login-brand,.login-symbol').count(),0);assert.equal(await page.getByText('Issue Tracker',{exact:true}).count(),0);assert.equal(await page.locator('.login-page footer').innerText(),'Inovace Technologies Ltd.');
  await page.screenshot({path:`artifacts/excel-layout/login-${width}.png`,fullPage:true});
 }
 const result=await page.evaluate(async source=>{
  const {createStyledReport}=await import('/lib/excelReport.ts');const book=await createStyledReport(source);const buffer=await book.xlsx.writeBuffer();
  const snapshots=book.worksheets.map(sheet=>({name:sheet.name,widths:sheet.columns.map(c=>Math.floor(c.width*7+5)),rows:Array.from({length:sheet.rowCount},(_,r)=>({number:r+1,height:sheet.getRow(r+1).height,cells:Array.from({length:sheet.columnCount},(_,c)=>{const cell=sheet.getCell(r+1,c+1);if(cell.isMerged&&cell.master.address!==cell.address)return null;return {address:cell.address,value:cell.value,date:cell.value instanceof Date,numFmt:cell.numFmt,text:cell.text,span:cell.isMerged?sheet.columnCount:1,font:cell.font,alignment:cell.alignment,fill:cell.fill,border:cell.border};}).filter(Boolean)}))}));
  return {bytes:Array.from(new Uint8Array(buffer)),snapshots};
 },source);
 fs.writeFileSync('artifacts/excel-layout/auto-fit.xlsx',Buffer.from(result.bytes));
 const saved=new ExcelJS.Workbook();await saved.xlsx.readFile('artifacts/excel-layout/auto-fit.xlsx');
 const table=saved.getWorksheet('Issue Reports');
 for(let c=1;c<=headers.length;c++){assert.equal(Boolean(table.getCell(5,c).alignment.wrapText),false);assert.equal(Boolean(table.getCell(5,c).alignment.shrinkToFit),false);assert.equal(table.getCell(6,c).border.left.style,'thin');assert.equal(table.getCell(6,c).border.right.style,'thin');}
 assert.equal(Boolean(table.getCell('B6').alignment.wrapText),false);assert.equal(table.getCell('E6').alignment.wrapText,true);assert.ok(table.getColumn(2).width>40);assert.ok(table.getColumn(3).width>25);assert.equal(table.getCell('A7').value,'00123');
 for(let r=0;r<rows.length;r++){if(rows[r][4].split('\n').length>25)assert.equal(table.getCell(r+6,5).value.replace(/\s+/g,' ').trim(),rows[r][4].replace(/\s+/g,' ').trim());else assert.equal(table.getCell(r+6,5).value,rows[r][4]);assert.ok(table.getRow(r+6).height<=409.5);}
 assert.ok(saved.getWorksheet('Pasted Spacing').getRow(6).height>30,'Pasted whitespace must be included in row-height measurement');
 assert.ok(table.getColumn(5).width>60,'Long Unicode text should widen before row-height clipping');
 assert.ok(Math.abs(saved.getWorksheet('CSAT Summary').getCell('B7').value-.999)<1e-12);
 const preview=result.snapshots.map(sheet=>({...sheet,rows:sheet.rows.map(row=>({...row,cells:row.cells.map(cell=>({...cell,display:cell.date?new Date(cell.value).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'}):typeof cell.value==='number'?XLSX.SSF.format(cell.numFmt||'General',cell.value):cell.text}))}))}));
 await page.setViewportSize({width:1800,height:1000});await page.setContent('<html><body style="margin:20px;background:#edf2f5;font-family:Calibri,Arial"></body></html>');
 await page.evaluate(sheets=>{
  for(const sheet of sheets){const title=document.createElement('h2');title.textContent=sheet.name;document.body.append(title);const table=document.createElement('table');table.style.cssText='border-collapse:collapse;table-layout:fixed;margin-bottom:40px;background:white;';table.style.width=sheet.widths.reduce((a,b)=>a+b,0)+'px';const cols=document.createElement('colgroup');sheet.widths.forEach(width=>{const col=document.createElement('col');col.style.width=width+'px';cols.append(col);});table.append(cols);
   for(const row of sheet.rows){const tr=document.createElement('tr');for(const cell of row.cells){const td=document.createElement('td');td.dataset.address=sheet.name+'!'+cell.address;td.colSpan=cell.span;td.style.cssText=`height:${row.height*4/3}px;box-sizing:border-box;padding:6px 12px;border:1px solid #e1eaf0;vertical-align:${cell.alignment.vertical==='middle'?'middle':'top'};background:#${(cell.fill.fgColor?.argb||'FFFFFFFF').slice(2)};color:#${(cell.font.color?.argb||'FF273D4A').slice(2)}`;const text=document.createElement('div');text.className='cell-text';text.dataset.address=td.dataset.address;text.style.cssText=`font-family:Calibri,Arial,sans-serif;font-size:${cell.font.size||11}pt;font-weight:${cell.font.bold?'700':'400'};line-height:${(cell.font.size||11)*1.4}pt;white-space:${cell.alignment.wrapText?'pre-wrap':'pre'};overflow-wrap:${cell.alignment.wrapText?'anywhere':'normal'};height:${row.height*4/3-14}px;overflow:hidden;text-align:${cell.alignment.horizontal};`;text.textContent=cell.display;td.append(text);tr.append(td);}table.append(tr);}document.body.append(table);}
 },preview);
 const overflow=await page.locator('.cell-text').evaluateAll(cells=>cells.filter(cell=>cell.scrollWidth>cell.clientWidth+2||cell.scrollHeight>cell.clientHeight+2).map(cell=>({address:cell.dataset.address,width:cell.clientWidth,scrollWidth:cell.scrollWidth,height:cell.clientHeight,scrollHeight:cell.scrollHeight,text:cell.textContent.slice(0,60)})));
 fs.writeFileSync('artifacts/excel-layout/overflow.json',JSON.stringify(overflow,null,2));assert.deepEqual(overflow,[],'Saved column/row dimensions must contain all rendered text');
 await page.locator('td[data-address="Issue Reports!E7"]').screenshot({path:'artifacts/excel-layout/unicode-cell.png'});await page.locator('td[data-address="Issue Reports!B6"]').screenshot({path:'artifacts/excel-layout/name-cell.png'});await page.locator('table').nth(1).screenshot({path:'artifacts/excel-layout/summary.png'});
 assert.deepEqual(errors,[]);console.log(JSON.stringify({sheets:saved.worksheets.length,bodyRows:rows.length,layout:'no overflowing text in measured saved cells',cases:'wide names, complete timestamps, Unicode, long paragraphs, multiline notes, unbroken URLs, numeric formats, summaries, empty exports',login:'top branding/icons removed; requested footer verified at desktop/mobile',errors}));
}finally{await browser.close();}
