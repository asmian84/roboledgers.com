import pdfplumber
import json
from pathlib import Path

# PDFs to analyze
pdfs = [
    (r"G:\My Drive\pdfs\BMO Chq.pdf", "BMO_Chequing"),
    (r"G:\My Drive\pdfs\CIBC Chq.pdf", "CIBC_Chequing"),
    (r"G:\My Drive\pdfs\RBC Chq.pdf", "RBC_Chequing"),
    (r"G:\My Drive\pdfs\Scotia CHq.pdf", "Scotia_Chequing"),
    (r"G:\My Drive\pdfs\TD Chq.pdf", "TD_Chequing"),
]

results = {}

for pdf_path, bank_name in pdfs:
    print(f"\n{'='*60}")
    print(f"Analyzing: {bank_name}")
    print('='*60)
    
    with pdfplumber.open(pdf_path) as pdf:
        text = pdf.pages[0].extract_text()
        
        # Find the transaction section
        lines = text.split('\n')
        
        # Print first 50 lines to see structure
        for i, line in enumerate(lines[:70]):
            if line.strip():
                print(f"{i:3d}: {line}")
        
        results[bank_name] = {
            "total_lines": len(lines),
            "sample_lines": lines[:70]
        }

# Save to file for analysis
with open('transaction_samples.json', 'w') as f:
    json.dump(results, f, indent=2)

print("\n\n✅ Saved samples to transaction_samples.json")
