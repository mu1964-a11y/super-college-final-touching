import XLSX from 'xlsx';

const wb = XLSX.readFile('College_2023_2030_Verified_Sections_And_Ledger.csv');
const rows = XLSX.utils.sheet_to_json(wb.Sheets['Sheet1']);

const patterns = new Set();
let totalItems = 0;

rows.forEach(r => {
  if (!r.Installments_Ledger_JSON) return;
  try {
    const list = JSON.parse(r.Installments_Ledger_JSON);
    list.forEach(item => {
      totalItems++;
      const rd = String(item.receipt_date || '').trim();
      if (!rd) {
        patterns.add('EMPTY');
      } else if (rd.includes('/')) {
        const parts = rd.split('/');
        patterns.add(`PARTS_${parts.length}: ${rd.slice(0, 30)}`);
      } else {
        patterns.add(`NO_SLASH: ${rd}`);
      }
    });
  } catch (e) {}
});

console.log('Total installment items in JSON:', totalItems);
console.log('Patterns sample (up to 30):', Array.from(patterns).slice(0, 30));
