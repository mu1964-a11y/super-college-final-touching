import XLSX from 'xlsx';

const wb = XLSX.readFile('College_2023_2030_Verified_Sections_And_Ledger.csv');
const rows = XLSX.utils.sheet_to_json(wb.Sheets['Sheet1']);

let withLedger = 0;
let withOther = 0;
let emptyLedger = 0;

rows.forEach((r, idx) => {
  if (r.Installments_Ledger_JSON && r.Installments_Ledger_JSON !== '[]') {
    withLedger++;
  } else {
    emptyLedger++;
  }
  if (r.Other_Fees_Paid && Number(r.Other_Fees_Paid) > 0) {
    withOther++;
  }
});

console.log(`Total rows: ${rows.length}`);
console.log(`Rows with Installments_Ledger_JSON: ${withLedger}`);
console.log(`Rows with empty ledger: ${emptyLedger}`);
console.log(`Rows with Other_Fees_Paid > 0: ${withOther}`);

// Print sample rows with other fees
console.log('\n--- Sample Other Fees ---');
rows.filter(r => r.Other_Fees_Paid && Number(r.Other_Fees_Paid) > 0).slice(0, 5).forEach(r => {
  console.log({
    name: r.Student_Name,
    otherPaid: r.Other_Fees_Paid,
    otherReceiptsDates: r.Other_Fees_Receipts_Dates
  });
});
