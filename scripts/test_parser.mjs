import XLSX from 'xlsx';

function parseReceiptDateStr(str) {
  if (!str) return { receipt: '', date: '' };
  const trimmed = String(str).trim();
  
  const m = trimmed.match(/^([A-Za-z0-9_-]+)\s*[/]\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/);
  if (m) {
    const receipt = m[1].trim();
    const dateRaw = m[2].trim();
    const dm = dateRaw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
    let dateIso = '';
    if (dm) {
      let day = dm[1].padStart(2, '0');
      let month = dm[2].padStart(2, '0');
      let yr = dm[3];
      if (yr.length === 2) yr = '20' + yr;
      dateIso = `${yr}-${month}-${day}`;
    }
    return { receipt, date: dateIso };
  }
  return { receipt: trimmed, date: '' };
}

const wb = XLSX.readFile('College_2023_2030_Verified_Sections_And_Ledger.csv');
const rows = XLSX.utils.sheet_to_json(wb.Sheets['Sheet1']);

let total = 0;
let parsedDateCount = 0;
let unparsedList = [];

rows.forEach(r => {
  if (!r.Installments_Ledger_JSON) return;
  try {
    const list = JSON.parse(r.Installments_Ledger_JSON);
    list.forEach(item => {
      total++;
      const res = parseReceiptDateStr(item.receipt_date);
      if (res.date) {
        parsedDateCount++;
      } else {
        unparsedList.push({ receipt_date: item.receipt_date, amount: item.amount, student: r.Student_Name });
      }
    });
  } catch (e) {}
});

console.log(`Total installment items: ${total}`);
console.log(`Successfully parsed date: ${parsedDateCount} (${((parsedDateCount/total)*100).toFixed(1)}%)`);
console.log(`Unparsed count: ${unparsedList.length}`);
if (unparsedList.length > 0) {
  console.log('Sample unparsed:', unparsedList.slice(0, 10));
}
