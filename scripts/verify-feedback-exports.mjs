import { seedAuthSession, fulfillAuthFixture } from './auth-fixture.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { chromium } from '@playwright/test';
import { createStyledReport } from '../lib/excelReport.ts';
fs.mkdirSync('artifacts/feedback-exports',{recursive:true});
const source=XLSX.utils.book_new();
const data=[['Client Name','Issue Date','Status','Amount (BDT)','Phone','Issue Details'],['Sample client','2026-11-05','Open',1250.5,'01700000001','A detailed issue description. '.repeat(20)],['Second client','2026-11-04','Closed',0,'00123','Resolved']];
XLSX.utils.book_append_sheet(source,XLSX.utils.aoa_to_sheet(data),'Issue Reports');
XLSX.utils.book_append_sheet(source,XLSX.utils.aoa_to_sheet([['PERFORMANCE SUMMARY',''],['Generated On','2026-11-05'],['Period','November'],['',''],['METRICS','VALUE'],['Issues',2],['Resolution rate','50%']]),'Summary');
XLSX.utils.book_append_sheet(source,XLSX.utils.aoa_to_sheet([['Client','Count'],['Sample client',2]]),'Clients Summary');
const styled=await createStyledReport(source);
await styled.xlsx.writeFile('artifacts/feedback-exports/styled-sample.xlsx');
const loaded=new ExcelJS.Workbook();await loaded.xlsx.readFile('artifacts/feedback-exports/styled-sample.xlsx');
const sheet=loaded.getWorksheet('Issue Reports');
assert.equal(sheet.getCell('A5').value,'Client Name');assert.equal(sheet.getCell('A6').value,'Sample client');
assert.equal(sheet.getCell('D6').value,1250.5);assert.equal(sheet.getCell('E6').value,'01700000001');assert.equal(sheet.getCell('E7').value,'00123');
assert.ok(sheet.getCell('B6').value instanceof Date);assert.equal(sheet.getCell('A5').fill.fgColor.argb,'FF16766A');
assert.equal(sheet.views[0].ySplit,5);assert.ok(sheet.autoFilter);assert.equal(sheet.getCell('F6').value,data[1][5]);assert.ok(sheet.getRow(6).height>30);
assert.equal(loaded.getWorksheet('Summary').getCell('B7').value,.5);assert.equal(loaded.getWorksheet('Clients Summary').getCell('A5').value,'Client');
const template=await createStyledReport(source,{template:true});assert.equal(template.getWorksheet('Issue Reports').getCell('A1').value,'Client Name');
const browser=await chromium.launch({channel:'chrome',headless:true});
const preview=await browser.newPage({viewport:{width:1500,height:850}});
const esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
let html='<html><body style="margin:30px;background:#eaf0f4;font-family:Calibri,Arial"><table style="border-collapse:collapse;background:white;width:1400px;box-shadow:0 10px 40px #18344418">';
for(let r=1;r<=7;r++){html+='<tr>';for(let c=1;c<=6;c++){const cell=sheet.getCell(r,c);if(cell.isMerged&&cell.master.address!==cell.address)continue;const span=cell.isMerged?6:1;html+='<td colspan="'+span+'" style="padding:12px 16px;min-width:100px;max-width:350px;border-bottom:1px solid #e1eaf0;background:#'+(cell.fill.fgColor?.argb||'FFFFFFFF').slice(2)+';color:#'+(cell.font.color?.argb||'FF273D4A').slice(2)+';font-size:'+(cell.font.size||11)+'pt;font-weight:'+(cell.font.bold?'700':'400')+'">'+esc(cell.value instanceof Date?cell.value.toISOString().slice(0,10):cell.text)+'</td>';}html+='</tr>';}
html+='</table></body></html>';await preview.setContent(html);await preview.screenshot({path:'artifacts/feedback-exports/excel-style-preview.png',fullPage:true});await preview.close();
const context=await browser.newContext({colorScheme:'dark'});
await seedAuthSession(context);
const errors=[]; const updates=[];
let variant='active';
const issue={id:'00000000-0000-4000-8000-000000000001',client_name:'Sample customer',issue_type:'System Bugs',status:'Open',priority:'High',assigned_person:'Support team',issue_date:'2026-11-05',created_at:'2026-11-05T09:00:00Z',issue_details:'Feedback verification fixture'};
await context.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}));
await context.route('https://*.supabase.co/**',async route=>{
 if(await fulfillAuthFixture(route))return;
 const req=route.request(),url=new URL(req.url());let body=[];
 if(url.pathname.endsWith('/rpc/get_public_issue_feedback')){body=variant==='missing'?null:variant==='submitted'?{...issue,feedback_date:'2026-11-05',feedback_rating:5,issue_resolved_confirmed:'Yes',customer_satisfaction:'Excellent'}:issue;}
 else if(url.pathname.endsWith('/rpc/submit_public_issue_feedback')){const input=req.postDataJSON();updates.push({feedback_rating:input.p_rating,issue_resolved_confirmed:input.p_resolved,customer_satisfaction:['Very Poor','Poor','Average','Good','Excellent'][input.p_rating-1]});body=null;}
 else if(!['GET','HEAD','OPTIONS'].includes(req.method()))return route.abort();
 else if(url.pathname.endsWith('/issues')){const item=variant==='missing'?null:variant==='submitted'?{...issue,feedback_date:'2026-11-05',feedback_rating:5,issue_resolved_confirmed:'Yes',customer_satisfaction:'Excellent'}:issue;body=url.searchParams.has('id')?item:(item?[item]:[]);}
 else if(url.pathname.endsWith('/branding_settings'))body=null;
 return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
});
await context.route('**/api/google-sheets/append',r=>r.abort());
const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
for(const width of [1440,390]){
 await page.setViewportSize({width,height:1000});variant='active';
 await page.goto('http://localhost:3000/feedback/'+issue.id);await page.locator('.rating-emoji').first().waitFor();
 assert.equal(await page.locator('html').evaluate(e=>e.classList.contains('dark')),false);
 assert.equal(await page.locator('.app-sidebar').count(),0);assert.equal(await page.locator('.rating-emoji').count(),5);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await page.getByRole('button',{name:'English',exact:true}).click();
 await page.getByRole('button',{name:'Yes Fully resolved',exact:true}).click();
 await page.getByRole('button',{name:'5 / 5 — Excellent',exact:true}).click();
 assert.equal(await page.getByRole('button',{name:'5 / 5 — Excellent',exact:true}).getAttribute('aria-pressed'),'true');
 await page.screenshot({path:`artifacts/feedback-exports/feedback-${width}.png`,fullPage:true});
 await page.locator('textarea').fill('Helpful support.');await page.getByRole('button',{name:'Submit Feedback',exact:true}).click();
 await page.getByText('Feedback Successfully Recorded',{exact:true}).waitFor();
 assert.equal(updates.at(-1).feedback_rating,5);assert.equal(updates.at(-1).customer_satisfaction,'Excellent');assert.equal(updates.at(-1).issue_resolved_confirmed,'Yes');
 for(const state of ['submitted','missing']){variant=state;await page.reload();await page.getByRole('button',{name:'English',exact:true}).click();await page.getByText(state==='submitted'?'Feedback Already Submitted':'Invalid Link or Ticket Not Found',{exact:true}).waitFor();assert.equal(await page.locator('html').evaluate(e=>e.classList.contains('dark')),false);}
}
variant='active';await page.goto('http://localhost:3000/issue-reports');
assert.equal(await page.locator('html').evaluate(e=>e.classList.contains('dark')),true);
await page.getByTitle('Edit Issue',{exact:true}).first().waitFor();
const downloadPromise=page.waitForEvent('download');await page.getByTitle('Export Excel',{exact:true}).click();const download=await downloadPromise;
await download.saveAs('artifacts/feedback-exports/issue-report-download.xlsx');
const exported=new ExcelJS.Workbook();await exported.xlsx.readFile('artifacts/feedback-exports/issue-report-download.xlsx');
const imported=XLSX.read(fs.readFileSync('artifacts/feedback-exports/issue-report-download.xlsx'),{type:'buffer'});const importedSheet=imported.Sheets[imported.SheetNames[0]];const dataStart=XLSX.utils.decode_range(importedSheet['!autofilter'].ref).s.r;assert.equal(XLSX.utils.sheet_to_json(importedSheet,{range:dataStart})[0]['Client Name'],'Sample customer');
assert.equal(exported.worksheets[0].views[0].ySplit,5);assert.ok(exported.worksheets[0].getRow(6).values.includes('Sample customer'));
assert.deepEqual(errors,[]);await browser.close();
console.log(JSON.stringify({feedback:'light in active, submitted, missing and success states; desktop/mobile verified',emojiRatings:5,fixtureSubmissions:updates.length,exports:'styled values, dates, identifiers, summaries, template headers and browser download verified',errors}));
