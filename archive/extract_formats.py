"""
Extract actual formats from real client bank statements
"""
import pdfplumber
import os

base_path = r"C:\Users\asmia\OneDrive - Swift Accounting and Business Solutions Ltd\Swift Drive\Corp Clients"

# Real statements found
statements = [
    ("Scotia Chq - Prana", os.path.join(base_path, r"914628 Alberta Ltd. (Prana Developments)\PBC\2024\CHQ\5. May 2024.pdf")),
    ("RBC Chq - Spec Construction", os.path.join(base_path, r"Spec Construction Inc\PBC\2024\Chq\Chequing_Statement-1690_2024-01-24[1].pdf")),
    ("BMO MC - Royal Auto", os.path.join(base_path, r"1913897 Alberta Ltd. (Royal Auto)\pbc-2023ye\mc\MasterCard Statement-2436 2023-01-05.pdf")),
    ("TD Chq - Royal Auto", os.path.join(base_path, r"1913897 Alberta Ltd. (Royal Auto)\pbc-2023ye\chq\1. AUG 2022.pdf")),
]

for name, path in statements:
    if os.path.exists(path):
        try:
            pdf = pdfplumber.open(path)
            text = pdf.pages[0].extract_text()
            print(f"\n{'='*80}")
            print(f"FORMAT: {name}")
            print(f"{'='*80}")
            print(text[:1200])
            print(f"\n")
        except Exception as e:
            print(f"❌ Error with {name}: {e}")
    else:
        print(f"❌ File not found: {path}")
