# PDF Bridge Test Guide

## Quick Test (Manual)

1. **Find or create a sample PDF** with tables (e.g., a bank statement)
2. **Place it in the project root**
3. **Run the bridge:**
   ```bash
   python src/services/parsers/docling_bridge.py your-statement.pdf
   ```

## Expected Output

Success:
```json
{
  "status": "success",
  "file": "your-statement.pdf",
  "table_count": 2,
  "tables": [
    {
      "page": 1,
      "table_index": 0,
      "caption": "Table 1 on Page 1",
      "headers": ["Date", "Description", "Amount"],
      "rows": [
        ["01/15", "Coffee Shop", "-$4.50"],
        ["01/16", "Gas Station", "-$45.00"]
      ]
    }
  ]
}
```

## Using from Node.js

```javascript
import { doclingParser } from './src/services/DoclingParser.js';

const result = await doclingParser.parsePDF('path/to/statement.pdf');
console.log(JSON.stringify(result, null, 2));
```

## Troubleshooting

- **"File not found"** → Check the path is correct
- **No tables extracted** → PDF might be scanned/image-based (pdfplumber needs text-based PDFs)
- **Script fails** → Check logs in stderr for Python errors
