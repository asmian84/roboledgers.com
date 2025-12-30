"""
Smart Cleaner - Merchant Data Cleaning Pipeline
================================================
A multi-pass cleaning script for PDF-extracted bank statement data.

Usage:
    python smart_cleaner.py

The script will prompt for the input Excel file path.
Output is saved in the same folder with '_MASTER_CLEAN.xlsx' suffix.
"""

import pandas as pd
import re
import os
import sys

# ============================================
# CONFIGURATION
# ============================================

# Canadian Provinces
CANADA_CODES = ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT']

# US States
US_CODES = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN',
    'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV',
    'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN',
    'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
]

ALL_STATE_CODES = CANADA_CODES + US_CODES

# Build regex pattern for state codes
STATE_CODES_PATTERN = '|'.join(ALL_STATE_CODES)

# ============================================
# PASS 1: ROW VALIDATION
# ============================================

def is_valid_row(value):
    """
    Determine if a row contains valid transaction data.
    Returns False if the row should be deleted.
    """
    if pd.isna(value):
        return False
    
    text = str(value).strip()
    
    # Rule 1: Empty or whitespace only
    if not text:
        return False
    
    # Rule 2: Less than 3 characters (garbage)
    if len(text) < 3:
        return False
    
    # Rule 3: Starts with a number (unless it's a known valid pattern)
    # Examples to DELETE: "12 06:00", "45.00", "123456"
    # We check if the FIRST character is a digit
    if text[0].isdigit():
        # Allow if it contains letters after (like "7-ELEVEN")
        # Check if there's at least 2 letters in the string
        letter_count = sum(1 for c in text if c.isalpha())
        if letter_count < 2:
            return False
        # Also delete if it looks like a date/time: "12 06:00"
        if re.match(r'^\d{1,2}\s+\d{1,2}:\d{2}', text):
            return False
        # Delete if it looks like just a dollar amount: "$45.00" or "45.00"
        if re.match(r'^[\$]?\d+[\.,]?\d*$', text):
            return False
    
    # Rule 4: Only special characters
    if not any(c.isalnum() for c in text):
        return False
    
    # Rule 5: Just dollar amounts (more thorough check)
    if re.match(r'^[\$\-\s]*[\d,]+\.?\d*[\s]*$', text):
        return False
    
    return True

# ============================================
# PASS 2: CELL CLEANING
# ============================================

def clean_cell(value):
    """
    Clean individual cell content.
    Normalizes whitespace, removes garbage characters.
    """
    if pd.isna(value):
        return ""
    
    text = str(value)
    
    # Remove non-printable characters (except newlines/tabs which we'll handle)
    text = ''.join(c for c in text if c.isprintable() or c in '\n\t')
    
    # Convert tabs to spaces
    text = text.replace('\t', ' ')
    
    # Remove multiple commas
    text = re.sub(r',{2,}', ',', text)
    
    # Remove leading/trailing commas
    text = text.strip(',')
    
    # Normalize multiple spaces to single space
    text = re.sub(r'\s+', ' ', text)
    
    # Final trim
    text = text.strip()
    
    return text

# ============================================
# PASS 3: MERCHANT NAME EXTRACTION
# ============================================

def extract_merchant_name(description):
    """
    Extract a clean merchant name from the transaction description.
    Strips city/state, store numbers, transaction IDs, etc.
    The original description is preserved separately.
    """
    if not description or pd.isna(description):
        return ""
    
    text = str(description).strip()
    original = text  # Keep original for fallback
    
    # --- Step 1: Remove Transaction IDs ---
    # Patterns like *AB123CD, *XY789ZZ
    text = re.sub(r'\*[A-Z0-9]{5,}', '', text, flags=re.IGNORECASE)
    
    # --- Step 2: Remove Reference Numbers ---
    # Patterns like #123456, REF:789012
    text = re.sub(r'#\d{4,}', '', text)
    text = re.sub(r'REF:\s*\d+', '', text, flags=re.IGNORECASE)
    
    # --- Step 3: Remove Store Numbers ---
    # Patterns like #1234, STORE 567
    text = re.sub(r'#\d{1,5}', '', text)
    text = re.sub(r'\bSTORE\s*\d+', '', text, flags=re.IGNORECASE)
    
    # --- Step 4: Remove Card Patterns ---
    # Patterns like XXXX1234, ****1234
    text = re.sub(r'[X\*]{4}\s*\d{4}', '', text, flags=re.IGNORECASE)
    
    # --- Step 5: Remove Date Patterns ---
    # MM/DD/YY, DD/MM/YYYY, YYYY-MM-DD
    text = re.sub(r'\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}', '', text)
    text = re.sub(r'\d{4}[/\-]\d{1,2}[/\-]\d{1,2}', '', text)
    
    # --- Step 6: Remove Time Patterns ---
    # HH:MM, HH:MM:SS
    text = re.sub(r'\d{1,2}:\d{2}(:\d{2})?', '', text)
    
    # --- Step 7: Strip City + State/Province (THE BIG ONE) ---
    # This is the most important step for normalizing merchants
    
    # Pattern A: " CITY, STATE" at end (e.g., " TOFINO, BC", " CALGARY, AB")
    text = re.sub(
        r'[\s,]+[A-Za-z\.\s]+[\s,]+(' + STATE_CODES_PATTERN + r')\s*$',
        '', text, flags=re.IGNORECASE
    )
    
    # Pattern B: " CITY STATE" at end with no comma (e.g., " TOFINO BC", " LAS VEGAS NV")
    text = re.sub(
        r'\s+[A-Za-z\.\s]{2,20}\s+(' + STATE_CODES_PATTERN + r')\s*$',
        '', text, flags=re.IGNORECASE
    )
    
    # Pattern C: Double state like " NY, NY" or " NY NY"
    text = re.sub(
        r'[\s,]+(' + STATE_CODES_PATTERN + r')[\s,]+\1\s*$',
        '', text, flags=re.IGNORECASE
    )
    
    # Pattern D: Just the state code at end if preceded by space (e.g., " BC", " ON")
    # Be careful here - only strip if the text before it looks like a city
    text = re.sub(
        r'\s+(' + STATE_CODES_PATTERN + r')\s*$',
        '', text, flags=re.IGNORECASE
    )
    
    # --- Step 8: Clean up aftermath ---
    # Remove trailing punctuation
    text = re.sub(r'[,\.\-\s]+$', '', text)
    
    # Normalize spaces
    text = re.sub(r'\s+', ' ', text).strip()
    
    # --- Step 9: Title Case ---
    # Convert "MCDONALDS" to "Mcdonalds"
    if text.isupper() and len(text) > 2:
        text = text.title()
    
    # --- Step 10: Fallback ---
    # If we stripped too much and ended up with nothing, use original
    if not text or len(text) < 2:
        text = original
        # At least title-case it
        if text.isupper():
            text = text.title()
    
    return text

# ============================================
# MAIN PROCESSING FUNCTION
# ============================================

def process_file(file_path):
    """
    Main processing function.
    Applies all cleaning passes and saves the result.
    """
    print(f"\n{'='*60}")
    print("  SMART CLEANER - Merchant Data Pipeline")
    print(f"{'='*60}\n")
    
    if not os.path.exists(file_path):
        print(f"❌ Error: File not found: {file_path}")
        return
    
    print(f"📂 Input: {file_path}")
    
    # Load Excel
    try:
        df = pd.read_excel(file_path)
        print(f"📊 Loaded {len(df)} rows, {len(df.columns)} columns")
    except Exception as e:
        print(f"❌ Error loading file: {e}")
        return
    
    # --- Find the Description Column ---
    desc_col = None
    for col in df.columns:
        col_lower = str(col).lower()
        if 'desc' in col_lower or 'transaction' in col_lower or 'detail' in col_lower:
            desc_col = col
            break
    
    if not desc_col:
        # Fallback: assume it's the first or second column with text data
        for col in df.columns:
            sample = df[col].dropna().head(10)
            if len(sample) > 0 and sample.apply(lambda x: isinstance(x, str) or pd.notna(x)).any():
                desc_col = col
                break
    
    if not desc_col:
        print("❌ Error: Could not identify a description column.")
        print(f"   Available columns: {list(df.columns)}")
        return
    
    print(f"📝 Using description column: '{desc_col}'")
    
    # --- PASS 1: Row Validation ---
    print("\n⚙️  PASS 1: Row Validation...")
    initial_count = len(df)
    df = df[df[desc_col].apply(is_valid_row)]
    pass1_removed = initial_count - len(df)
    print(f"   ✓ Removed {pass1_removed} invalid rows")
    print(f"   ✓ Remaining: {len(df)} rows")
    
    # --- PASS 2: Cell Cleaning ---
    print("\n⚙️  PASS 2: Cell Cleaning...")
    df['_cleaned_desc'] = df[desc_col].apply(clean_cell)
    # Remove any rows that became empty after cleaning
    before_clean = len(df)
    df = df[df['_cleaned_desc'].str.len() > 2]
    pass2_removed = before_clean - len(df)
    print(f"   ✓ Removed {pass2_removed} rows that became empty after cleaning")
    print(f"   ✓ Remaining: {len(df)} rows")
    
    # --- PASS 3: Merchant Extraction ---
    print("\n⚙️  PASS 3: Merchant Name Extraction...")
    df['Merchant_Name'] = df['_cleaned_desc'].apply(extract_merchant_name)
    
    # Count unique merchants
    unique_merchants = df['Merchant_Name'].nunique()
    unique_descriptions = df['_cleaned_desc'].nunique()
    print(f"   ✓ Extracted {unique_merchants} unique merchants")
    print(f"   ✓ From {unique_descriptions} unique descriptions")
    
    # --- PASS 4: Output Generation ---
    print("\n⚙️  PASS 4: Generating Output...")
    
    # Create final dataframe with only the two columns we want
    output_df = pd.DataFrame({
        'Merchant_Name': df['Merchant_Name'],
        'Transaction_Description': df['_cleaned_desc']  # The cleaned but original description
    })
    
    # Sort by merchant name for easier review
    output_df = output_df.sort_values('Merchant_Name')
    
    # Generate output path
    dir_name = os.path.dirname(file_path)
    base_name = os.path.basename(file_path)
    name_part, _ = os.path.splitext(base_name)
    output_path = os.path.join(dir_name, f"{name_part}_MASTER_CLEAN.xlsx")
    
    # Save
    output_df.to_excel(output_path, index=False)
    
    # --- Summary ---
    print(f"\n{'='*60}")
    print("  ✅ CLEANING COMPLETE!")
    print(f"{'='*60}")
    print(f"\n📊 Summary:")
    print(f"   Original Rows:      {initial_count}")
    print(f"   Final Rows:         {len(output_df)}")
    print(f"   Rows Removed:       {initial_count - len(output_df)}")
    print(f"   Unique Merchants:   {unique_merchants}")
    print(f"   Unique Descriptions:{unique_descriptions}")
    print(f"\n💾 Saved to: {output_path}")
    
    # Show sample
    print(f"\n📋 Sample Output (first 10 rows):")
    print("-" * 60)
    for idx, row in output_df.head(10).iterrows():
        merch = row['Merchant_Name'][:25].ljust(25)
        desc = row['Transaction_Description'][:30]
        print(f"   {merch} | {desc}")
    print("-" * 60)

# ============================================
# ENTRY POINT
# ============================================

if __name__ == "__main__":
    print("\n" + "="*60)
    print("  🧹 SMART CLEANER - Bank Statement Data Pipeline")
    print("="*60)
    
    # Get input file
    if len(sys.argv) > 1:
        target_file = sys.argv[1]
    else:
        target_file = input("\n📂 Enter full path to Excel file (.xlsx): ").strip()
    
    # Remove quotes if user copied path with them
    target_file = target_file.replace('"', '').replace("'", "")
    
    if not target_file:
        print("❌ No file specified. Exiting.")
        sys.exit(1)
    
    process_file(target_file)
    
    input("\n\nPress Enter to exit...")
