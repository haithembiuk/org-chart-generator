const fs = require('fs');
const Papa = require('papaparse');

// Read your CSV file
const csvContent = fs.readFileSync('/home/jakhab/temp/orgchart_sample.csv', 'utf-8');

console.log('Raw CSV content:');
console.log(JSON.stringify(csvContent));
console.log('\n');

// Parse with Papa Parse
Papa.parse(csvContent, {
  complete: (results) => {
    console.log('Parsed data:');
    console.log(JSON.stringify(results.data, null, 2));
    
    console.log('\n--- Header Analysis ---');
    if (results.data.length > 0) {
      const headers = results.data[0];
      headers.forEach((header, index) => {
        console.log(`Column ${index}: "${header}" (trimmed: "${String(header).trim()}")`);
      });
    }
    
    console.log('\n--- Data Rows ---');
    results.data.slice(1).forEach((row, rowIndex) => {
      console.log(`Row ${rowIndex + 1}:`, row.map(cell => `"${cell}"`));
    });
  },
  error: (error) => {
    console.error('CSV parsing error:', error);
  }
});