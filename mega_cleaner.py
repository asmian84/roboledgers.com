"""
MEGA CLEANER - Ultimate Bank Statement Data Pipeline
=====================================================
Combines the best of both cleaning approaches to handle
the "nightmare scenario" of messy PDF-extracted data.

Features:
- Non-breaking space handling
- Row concatenation (fixes split fields)
- Legal entity suffix removal (Inc, Ltd, Corp, LLC)
- Month pattern removal (JAN 12, etc.)
- Comprehensive US + Canada state/province codes
- City + State pattern stripping (TOFINO BC, LAS VEGAS NV)
- Card patterns (XXXX1234, ****1234)
- Transaction ID patterns (*AB123CD)
- Time patterns (12:45:00)
- Deduplication based on description
- Progress feedback with statistics
- Interactive file prompt

Usage:
    python mega_cleaner.py
    
Or with argument:
    python mega_cleaner.py "path/to/file.xlsx"
"""

import pandas as pd
import re
import os
import sys

# ============================================
# CONFIGURATION - All Codes & Patterns
# ============================================

# Canadian Provinces
CANADA_CODES = ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT']

# US States (Complete List)
US_CODES = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN',
    'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV',
    'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN',
    'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
]

# Country codes to strip
COUNTRY_CODES = ['CA', 'US', 'USA', 'CAN', 'CDN']

ALL_LOCATION_CODES = CANADA_CODES + US_CODES + COUNTRY_CODES
LOCATION_CODES_PATTERN = '|'.join(ALL_LOCATION_CODES)

# Month abbreviations for date patterns
MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
MONTHS_PATTERN = '|'.join(MONTHS)

# Header keywords to detect and skip
HEADER_KEYWORDS = [
    'transaction description', 'merchant name', 'opening balance', 'closing balance',
    'debit', 'credit', 'balance', 'date', 'amount', 'reference', 'details'
]

# Legal entity suffixes to strip from merchant names
LEGAL_SUFFIXES = ['INC', 'LTD', 'CORP', 'LLC', 'CO', 'COMPANY', 'LIMITED', 'INCORPORATED']

# Generic accounting terms that should NOT be used as merchant names
# If merchant is one of these, extract real merchant from description
GENERIC_MERCHANT_TERMS = [
    'accounts payable', 'accounts receivable', 'account fee', 'account balance',
    'account rebate', 'account dept', 'foreign currency', 'foreign exchange',
    'wire transfer', 'bank transfer', 'transfer', 'payment', 'deposit',
    'withdrawal', 'fee', 'charge', 'credit', 'debit', 'refund', 'reversal',
    'adjustment', 'correction', 'misc', 'miscellaneous', 'other', 'unknown',
    'pending', 'processing', 'transaction', 'purchase', 'sale'
]

# Common Canadian cities to strip from merchant names
COMMON_CITIES = [
    'CALGARY', 'EDMONTON', 'VANCOUVER', 'TORONTO', 'MONTREAL', 'OTTAWA', 'WINNIPEG',
    'HALIFAX', 'VICTORIA', 'REGINA', 'SASKATOON', 'QUEBEC', 'HAMILTON', 'KITCHENER',
    'LONDON', 'MISSISSAUGA', 'BRAMPTON', 'SURREY', 'BURNABY', 'RICHMOND', 'MARKHAM',
    'AIRDRIE', 'RED DEER', 'LETHBRIDGE', 'MEDICINE HAT', 'GRANDE PRAIRIE', 'CANMORE',
    'BANFF', 'TOFINO', 'KELOWNA', 'KAMLOOPS', 'NANAIMO', 'WHISTLER',
    # US Cities
    'NEW YORK', 'LOS ANGELES', 'CHICAGO', 'HOUSTON', 'PHOENIX', 'PHILADELPHIA',
    'SAN ANTONIO', 'SAN DIEGO', 'DALLAS', 'SAN JOSE', 'AUSTIN', 'JACKSONVILLE',
    'FORT WORTH', 'COLUMBUS', 'CHARLOTTE', 'SEATTLE', 'DENVER', 'WASHINGTON',
    'BOSTON', 'NASHVILLE', 'LAS VEGAS', 'PORTLAND', 'MEMPHIS', 'LOUISVILLE',
    'BALTIMORE', 'MILWAUKEE', 'ALBUQUERQUE', 'TUCSON', 'FRESNO', 'MESA', 'ATLANTA',
    'MIAMI', 'ORLANDO', 'TAMPA', 'PITTSBURGH', 'MINNEAPOLIS', 'CLEVELAND', 'DETROIT'
]

# ============================================
# UTILITY FUNCTIONS
# ============================================

def clean_whitespace(text):
    """
    Comprehensive whitespace cleanup.
    Handles non-breaking spaces, newlines, tabs, and collapses multiples.
    Also removes illegal Excel characters.
    """
    if not isinstance(text, str):
        return ""
    
    # Remove illegal Excel characters (control characters except tab/newline)
    # Excel doesn't allow characters in ranges: 0x00-0x08, 0x0B-0x0C, 0x0E-0x1F
    ILLEGAL_CHARS_RE = re.compile(r'[\x00-\x08\x0B\x0C\x0E-\x1F]')
    text = ILLEGAL_CHARS_RE.sub('', text)
    
    # Replace non-breaking spaces (from PDFs) with regular space
    text = text.replace('\xa0', ' ')
    
    # Replace newlines and tabs with space
    text = text.replace('\n', ' ').replace('\r', ' ').replace('\t', ' ')
    
    # Remove non-printable characters
    text = ''.join(c for c in text if c.isprintable() or c == ' ')
    
    # Collapse multiple spaces into one
    text = re.sub(r'\s+', ' ', text)
    
    # Strip leading/trailing
    return text.strip()

def is_junk_row(text):
    """
    Returns True if the row is garbage and should be deleted.
    COMPREHENSIVE garbage detection.
    """
    # Too short
    if len(text) < 3:
        return True
    
    # Too long (likely account summary garbage)
    if len(text) > 300:
        return True
    
    # =========================================
    # IMMEDIATE GARBAGE PATTERNS (DELETE NOW)
    # =========================================
    
    # Pattern: Starts with / followed by numbers (e.g., "/13", "/14", "/15")
    if re.match(r'^\/\d+', text):
        return True
    
    # Pattern: Phone numbers (e.g., "(800) 567-3343", "1-800-123-4567")
    if re.match(r'^\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{4}', text):
        return True
    if re.match(r'^1[\-\s]?\d{3}[\-\s]?\d{3}[\-\s]?\d{4}', text):
        return True
    
    # Pattern: Just numbers and special chars (no letters)
    if re.match(r'^[\d\s\*\/\#\$\-\+\=\@\!\.\,\(\)]+$', text):
        return True
    
    # =========================================
    # PATTERN-BASED GARBAGE DETECTION
    # =========================================
    
    # Starts with garbage characters: *, /, #, $, -, +, =, @, !, numbers
    if re.match(r'^[\*\/\#\$\-\+\=\@\!\.\,\s\d]+', text):
        # Strip the garbage prefix and check what's left
        cleaned = re.sub(r'^[\*\/\#\$\-\+\=\@\!\.\,\s\d]+', '', text).strip()
        # If nothing meaningful left, it's junk
        if len(cleaned) < 3:
            return True
        # If first char is still not a letter, junk
        if cleaned and not cleaned[0].isalpha():
            return True
    
    # Starts with a number (dates, amounts, reference numbers)
    # BUT allow things like "7-ELEVEN" or "3M COMPANY"
    if text[0].isdigit():
        # Exception: 7-ELEVEN, 3M, 1-800 patterns
        if re.match(r'^\d{1,2}[\-\s]?[A-Za-z]{2,}', text):
            pass  # Allow
        else:
            return True
    
    # Only special characters (no letters)
    letter_count = sum(1 for c in text if c.isalpha())
    if letter_count < 3:
        return True
    
    # =========================================
    # URL DETECTION
    # =========================================
    
    if re.search(r'https?://', text, re.IGNORECASE):
        return True
    if re.search(r'www\.', text, re.IGNORECASE):
        return True
    if re.search(r'\.com|\.ca|\.org|\.net|\.gov', text, re.IGNORECASE):
        # Allow if it looks like a company name: "AMAZON.COM" is okay if short
        if len(text) > 50:
            return True
    
    # =========================================
    # ACCOUNT SUMMARY / STATEMENT GARBAGE
    # =========================================
    
    garbage_keywords = [
        # Account/Statement garbage
        'account summary', 'previous balance', 'opening balance', 'closing balance',
        'total balance', 'statement date', 'payment due', 'minimum payment',
        'credit limit', 'available credit', 'interest rate', 'annual fee',
        'account number', 'card number', 'transaction date', 'posting date',
        'billing period', 'statement period', 'amount due', 'new balance',
        'past due', 'finance charge', 'late fee', 'overlimit fee',
        'cash advance', 'balance transfer', 'principal', 'overdraft fee',
        'prepared by', 'reviewed by', 'year end', 'year-end',
        'commitment period', 'commitment:', 'cancellation', 'cancelled on',
        'itinerary', 'confirmation:', 'booking ref', 'reservation',
        'enter amount', 'column b1', 'column c1', 'on line', 'on page',
        'if more', 'if none', 'calculate the', 'deductible on line',
        'general ledger', 'journal entries', 'source annotation',
        'securities summary', 'marketable securities', 'opening balance purchases',
        'net gain', 'net loss', 'proceeds from sale', 'cost additions',
        # Investment/Tax disclaimers (from ultra_cleaner)
        'return of capital', 'foreign tax paid', 'actual div', 'security description',
        'distrib return', 'capital gain', 'payments/credits', 'purchases/charges',
        'cash advan', 'interest advance', 'interest charge', 'annual interest',
        'payment received', 'entries after', 'balance brought forw',
        # Tax form garbage
        'taxation year', 'being reported', 'during the taxation', 'tax year',
        'when completed', 'japan protected', 'alberta ltd', 'if you have any questions',
        # Balance forward (not a real transaction)
        'balance forward', 'balance forwd', 'balance fwd', 'bal forward', 'bal fwd',
        # Mileage/expense tracking garbage
        'kilometros', 'mileage expense', 'mileage by vehicle', 'vehicle summary',
        'hammerhead systems', 'expense report', 'mileage report',
        # Other statement garbage
        'service charge', 'monthly fee', 'total of new transactions',
        'visa', 'mastercard', 'payment received'
    ]
    
    text_lower = text.lower()
    for keyword in garbage_keywords:
        if keyword in text_lower:
            return True
    
    # =========================================
    # HEADER ROW DETECTION
    # =========================================
    
    headers = [
        'merchant name', 'transaction description', 'description', 'amount',
        'date', 'debit', 'credit', 'balance', 'reference', 'details', 'memo'
    ]
    
    text_stripped = text_lower.strip()
    if text_stripped in headers:
        return True
    
    # =========================================
    # GIBBERISH DETECTION
    # =========================================
    
    # Too many special characters relative to length
    special_count = sum(1 for c in text if not c.isalnum() and c != ' ')
    if len(text) > 10 and special_count / len(text) > 0.3:
        return True
    
    # =========================================
    # NUMERIC GARBAGE DETECTION
    # =========================================
    
    # Mostly numbers with few letters (likely amounts/dates)
    digit_count = sum(1 for c in text if c.isdigit())
    if len(text) > 10 and digit_count / len(text) > 0.5:
        return True
    
    return False

# ============================================
# CLEANING FUNCTIONS
# ============================================

def clean_description(text):
    """
    Cleans the Transaction Description.
    Removes obvious garbage but preserves the essence of the transaction.
    """
    # --- Step 1: Basic Cleanup ---
    text = clean_whitespace(text)
    
    # --- Step 2: Remove Currency Symbols ---
    text = re.sub(r'[\$€£¥]', '', text)
    
    # --- Step 3: Remove Stray Commas/Semicolons at boundaries ---
    text = re.sub(r'^[,;\s]+', '', text)
    text = re.sub(r'[,;\s]+$', '', text)
    text = re.sub(r',{2,}', ',', text)  # Multiple commas
    
    # --- Step 4: Remove DD/MM/YYYY or YYYY-MM-DD dates ---
    text = re.sub(r'\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}', '', text)
    text = re.sub(r'\d{4}[/\-]\d{1,2}[/\-]\d{1,2}', '', text)
    
    # --- Step 5: Remove Times like 12:45:00 ---
    text = re.sub(r'\b\d{1,2}:\d{2}(:\d{2})?\b', '', text)
    
    # --- Step 6: Remove Card Patterns (XXXX1234, ****5678) ---
    text = re.sub(r'[X\*]{4}\s*\d{4}', '', text, flags=re.IGNORECASE)
    
    # --- Step 7: Final Whitespace Cleanup ---
    text = clean_whitespace(text)
    
    return text

def extract_merchant_name(description):
    """
    The MEGA Merchant Name Extractor.
    Derives a clean, normalized Merchant Name from the messy Description.
    """
    if not description or len(description) < 2:
        return ""
    
    text = description
    original = description  # Fallback
    
    # =========================================
    # STEP 0: AGGRESSIVE PREFIX STRIPPING
    # =========================================
    
    # Strip ALL leading garbage: *, /, #, $, -, +, =, @, !, numbers, spaces, commas, dots
    text = re.sub(r'^[\*\/\#\$\-\+\=\@\!\.\,\s\d\'\"\(\)\[\]\{\}]+', '', text)
    
    # If we stripped too much and nothing left, try original
    if len(text) < 2:
        text = original
    
    # =========================================
    # STEP 1: Remove Transaction Identifiers
    # =========================================
    
    # Transaction IDs like *AB123CD, *XY789ZZ
    text = re.sub(r'\*[A-Z0-9]{5,}', '', text, flags=re.IGNORECASE)
    
    # Reference numbers like #123456, REF:789012
    text = re.sub(r'#\d{4,}', '', text)
    text = re.sub(r'\bREF[:\s]*\d+', '', text, flags=re.IGNORECASE)
    
    # =========================================
    # STEP 1.5: Remove Phone Numbers & Garbage Codes
    # =========================================
    
    # Phone numbers embedded in merchant (e.g., "8008336687", "800-833-6687")
    text = re.sub(r'\b\d{10,11}\b', '', text)  # 10-11 digit numbers
    text = re.sub(r'\b\d{3}[\-\s]?\d{3}[\-\s]?\d{4}\b', '', text)  # 800-123-4567
    
    # "Foreign Currency" mentions
    text = re.sub(r'\bFOREIGN\s*CURRENCY\b', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\bEXCHANGE\s*RATE\b', '', text, flags=re.IGNORECASE)
    
    # Airbnb/booking garbage codes (random alphanumeric like "Hm5m8ffzea", "HMIFQJ2FHX")
    text = re.sub(r'\*\s*[A-Za-z0-9]{8,}', '', text)  # * followed by long code
    text = re.sub(r'\b[A-Z]{2,4}[0-9][A-Z0-9]{5,}\b', '', text)  # Mixed caps+numbers
    
    # URLs and domains
    text = re.sub(r'\b[A-Za-z]+\.(com|ca|org|net)\b', '', text, flags=re.IGNORECASE)
    
    # =========================================
    # STEP 1.6: Remove Currency Codes & Exchange Rates (from file analysis)
    # =========================================
    
    # Currency prefixes like "AUD23.40@", "USD14.95@", "GBP55.00@", "CAD10.00@"
    text = re.sub(r'\b(AUD|USD|GBP|EUR|CAD|NZD|CHF|JPY)\d+\.?\d*@?', '', text, flags=re.IGNORECASE)
    
    # Exchange rates (decimal numbers like "1.652182", "1.025000")
    text = re.sub(r'\b\d+\.\d{4,}\b', '', text)  # Numbers with 4+ decimal places
    
    # @ symbols (often followed by amounts or left over)
    text = re.sub(r'@\s*\d*\.?\d*', '', text)
    text = re.sub(r'@', '', text)
    
    # Trailing amounts (e.g., "53.47 0" at end of merchant)
    text = re.sub(r'\s+\d+\.\d{1,2}\s*\d*$', '', text)
    
    # Trailing single digits or zeros (e.g., "AUTOMOBILITE ST. LAURENT QC 53.47 0")
    text = re.sub(r'\s+\d{1,2}$', '', text)
    
    # =========================================
    # STEP 2: Remove Store/Location Numbers
    # =========================================
    
    # Store numbers like #123, STORE 567
    text = re.sub(r'#\d{1,5}\b', '', text)
    text = re.sub(r'\bSTORE\s*\d+', '', text, flags=re.IGNORECASE)
    
    # Trailing numbers (often store numbers) like "McDonalds 442"
    text = re.sub(r'\s+\d{1,5}$', '', text)
    
    # =========================================
    # STEP 3: Remove Date Patterns
    # =========================================
    
    # Month patterns like "JAN 12", "DEC 25"
    text = re.sub(
        r'\b(' + MONTHS_PATTERN + r')[\s\-]?\d{1,2}\b',
        '', text, flags=re.IGNORECASE
    )
    
    # Day patterns like "12 JAN", "25 DEC"
    text = re.sub(
        r'\b\d{1,2}[\s\-]?(' + MONTHS_PATTERN + r')\b',
        '', text, flags=re.IGNORECASE
    )
    
    # Full date patterns DD/MM/YYYY
    text = re.sub(r'\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}', '', text)
    
    # =========================================
    # STEP 4: Remove Card & Time Patterns
    # =========================================
    
    # Card patterns XXXX1234
    text = re.sub(r'[X\*]{4}\s*\d{4}', '', text, flags=re.IGNORECASE)
    
    # Time patterns 12:45
    text = re.sub(r'\b\d{1,2}:\d{2}(:\d{2})?\b', '', text)
    
    # =========================================
    # STEP 4.5: Remove Dollar Amounts & Standalone Numbers (from ultra_cleaner)
    # =========================================
    
    # Dollar amounts with commas (1,234.56)
    text = re.sub(r'\b\d{1,3}(?:,\d{3})*\.\d+\b', '', text)
    
    # Standalone numbers (2023, 402, etc.) - but not at start of brand names
    text = re.sub(r'\s+\d+\s+', ' ', text)  # Numbers surrounded by spaces
    text = re.sub(r'\s+\d+$', '', text)     # Numbers at end
    
    # =========================================
    # STEP 5: Remove Legal Entity Suffixes
    # =========================================
    
    # Inc, Ltd, Corp, LLC, Co (with or without dots)
    for suffix in LEGAL_SUFFIXES:
        text = re.sub(r'\b' + suffix + r'\.?\b', '', text, flags=re.IGNORECASE)
    
    # =========================================
    # STEP 6: Remove City + State/Province (THE BIG ONE)
    # =========================================
    
    # Pattern A: "CITY, STATE" at end (e.g., "TOFINO, BC", "CALGARY, AB")
    text = re.sub(
        r'[\s,]+[A-Za-z\.\s]{2,20}[\s,]+(' + LOCATION_CODES_PATTERN + r')\s*$',
        '', text, flags=re.IGNORECASE
    )
    
    # Pattern B: "CITY STATE" at end with no comma (e.g., "TOFINO BC", "LAS VEGAS NV")
    text = re.sub(
        r'\s+[A-Za-z\.\s]{2,20}\s+(' + LOCATION_CODES_PATTERN + r')\s*$',
        '', text, flags=re.IGNORECASE
    )
    
    # Pattern C: Double state like "NY, NY" or "NY NY"
    text = re.sub(
        r'[\s,]+(' + LOCATION_CODES_PATTERN + r')[\s,]+\1\s*$',
        '', text, flags=re.IGNORECASE
    )
    
    # Pattern D: Just state code at end (e.g., " BC", " ON")
    text = re.sub(
        r'\s+(' + LOCATION_CODES_PATTERN + r')\s*$',
        '', text, flags=re.IGNORECASE
    )
    
    # Pattern E: Country codes anywhere
    for code in COUNTRY_CODES:
        text = re.sub(r'\b' + code + r'\b', '', text, flags=re.IGNORECASE)
    
    # =========================================
    # STEP 7: Final Cleanup
    # =========================================
    
    # Remove trailing punctuation
    text = re.sub(r'[,\.\-\s\*\#]+$', '', text)
    
    # Remove leading punctuation
    text = re.sub(r'^[,\.\-\s\*\#]+', '', text)
    
    # Normalize spaces
    text = clean_whitespace(text)
    
    # =========================================
    # STEP 8: Title Case
    # =========================================
    
    if text.isupper() and len(text) > 2:
        text = text.title()
    
    # =========================================
    # STEP 9: Fallback
    # =========================================
    
    if not text or len(text) < 2:
        text = original
        if text.isupper():
            text = text.title()
    
    return text

def extract_merchant_from_description(description):
    """
    Extracts a merchant name from the transaction description.
    Used as fallback when the merchant column contains generic terms.
    Looks for capitalized company names.
    """
    if not description or len(description) < 3:
        return ""
    
    text = description.strip()
    
    # Strategy 1: Look for ALL CAPS words at the start (common in bank statements)
    # E.g., "ACCOUNTS PAYABLE TRAN FEE INTUIT CANADA U 75.25 44,877.04-"
    # We want to find "INTUIT CANADA"
    
    # Split into words and look for sequences of capitalized words
    words = text.split()
    
    # Find sequences of capitalized words that look like company names
    candidates = []
    current_candidate = []
    
    for word in words:
        # Skip common generic words
        generic_words = ['THE', 'AND', 'OR', 'FOR', 'TO', 'FROM', 'IN', 'ON', 'AT', 'BY',
                        'TRAN', 'FEE', 'DEPOSIT', 'PAYMENT', 'TRANSFER', 'CREDIT', 'DEBIT',
                        'ACCOUNTS', 'PAYABLE', 'RECEIVABLE', 'ACCOUNT', 'U', 'C', 'CAD', 'USD']
        
        # Skip if it's a number or amount
        if re.match(r'^[\d\$\,\.\-\+]+$', word):
            if current_candidate:
                candidates.append(' '.join(current_candidate))
                current_candidate = []
            continue
        
        # Skip generic words
        if word.upper() in generic_words:
            if current_candidate:
                candidates.append(' '.join(current_candidate))
                current_candidate = []
            continue
        
        # Skip very short words
        if len(word) < 2:
            if current_candidate:
                candidates.append(' '.join(current_candidate))
                current_candidate = []
            continue
        
        # If it's mostly letters and looks like a name, add it
        if re.match(r'^[A-Za-z][A-Za-z\-\'\.]+$', word):
            current_candidate.append(word)
        else:
            if current_candidate:
                candidates.append(' '.join(current_candidate))
                current_candidate = []
    
    if current_candidate:
        candidates.append(' '.join(current_candidate))
    
    # Find the best candidate (longest one that's not too long)
    best = ""
    for candidate in candidates:
        if len(candidate) > len(best) and len(candidate) < 50:
            # Skip if it's a generic term
            candidate_lower = candidate.lower()
            is_generic = False
            for term in GENERIC_MERCHANT_TERMS:
                if term in candidate_lower:
                    is_generic = True
                    break
            if not is_generic:
                best = candidate
    
    # Title case the result
    if best and best.isupper():
        best = best.title()
    
    return best

# ============================================
# MAIN PROCESSING
# ============================================

def process_file(file_path):
    """
    Main processing function.
    Applies all cleaning passes and saves the result.
    """
    print(f"\n{'='*70}")
    print("  🔥 MEGA CLEANER - Ultimate Bank Statement Data Pipeline")
    print(f"{'='*70}\n")
    
    if not os.path.exists(file_path):
        print(f"❌ Error: File not found: {file_path}")
        return
    
    print(f"📂 Input: {file_path}")
    
    # =========================================
    # STEP 1: LOAD FILE
    # =========================================
    
    try:
        file_ext = os.path.splitext(file_path)[1].lower()
        
        if file_ext == '.csv':
            # Try with headers first (structured data)
            df = pd.read_csv(file_path, encoding='utf-8', on_bad_lines='skip')
            print(f"📊 Loaded CSV: {len(df)} rows, {len(df.columns)} columns")
        elif file_ext in ['.xlsx', '.xls']:
            df = pd.read_excel(file_path)
            print(f"📊 Loaded Excel: {len(df)} rows, {len(df.columns)} columns")
        else:
            try:
                df = pd.read_csv(file_path, encoding='utf-8', on_bad_lines='skip')
                print(f"📊 Loaded as CSV: {len(df)} rows, {len(df.columns)} columns")
            except:
                df = pd.read_excel(file_path)
                print(f"📊 Loaded as Excel: {len(df)} rows, {len(df.columns)} columns")
    except Exception as e:
        print(f"❌ Error loading file: {e}")
        return
    
    # =========================================
    # STEP 2: DETECT DATA TYPE (Structured vs Raw)
    # =========================================
    
    # Check if this is structured data (has recognizable column names)
    columns_lower = [str(c).lower() for c in df.columns]
    
    # Look for description column
    desc_col = None
    merchant_col = None
    
    # Common column names for description
    desc_keywords = ['description', 'transaction_description', 'transactiondescription', 
                     'details', 'memo', 'particulars', 'narrative']
    for i, col in enumerate(columns_lower):
        for keyword in desc_keywords:
            if keyword in col:
                desc_col = df.columns[i]
                break
        if desc_col:
            break
    
    # Common column names for existing merchant (from AI processor)
    merchant_keywords = ['merchant', 'merchant_name', 'merchantname', 'cleanmerchant', 
                         'clean_merchant', 'vendor', 'payee']
    for i, col in enumerate(columns_lower):
        for keyword in merchant_keywords:
            if keyword in col:
                merchant_col = df.columns[i]
                break
        if merchant_col:
            break
    
    # Determine processing mode
    if desc_col:
        print(f"\n✅ STRUCTURED DATA DETECTED")
        print(f"   Description Column: '{desc_col}'")
        if merchant_col:
            print(f"   Merchant Column: '{merchant_col}'")
        structured_mode = True
    else:
        print(f"\n⚠️  RAW DATA MODE (no description column found)")
        print(f"   Will concatenate all columns per row")
        structured_mode = False
    
    initial_count = len(df)
    cleaned_rows = []
    skipped_junk = 0
    skipped_empty = 0
    skipped_short = 0
    
    print(f"\n⚙️  Processing {initial_count} rows...")
    print("-" * 50)
    
    # =========================================
    # STEP 3: PROCESS ROWS
    # =========================================
    
    for index, row in df.iterrows():
        
        if structured_mode:
            # --- STRUCTURED MODE: Use specific columns ---
            description_raw = str(row[desc_col]) if pd.notna(row[desc_col]) else ""
            
            # Get existing merchant if available, else we'll extract it
            if merchant_col and pd.notna(row[merchant_col]):
                existing_merchant = str(row[merchant_col])
            else:
                existing_merchant = None
                
        else:
            # --- RAW MODE: Concatenate all columns ---
            description_raw = " ".join([str(x) for x in row if pd.notna(x)])
            existing_merchant = None
        
        # --- Clean the description ---
        description_raw = clean_whitespace(description_raw)
        
        # Skip empty
        if not description_raw or len(description_raw) < 3:
            skipped_empty += 1
            continue
        
        # Skip junk
        if is_junk_row(description_raw):
            skipped_junk += 1
            continue
        
        # Clean description
        description = clean_description(description_raw)
        
        # =========================================
        # SMART MERCHANT EXTRACTION
        # =========================================
        
        merchant = None
        
        # First, check if existing merchant is a GENERIC term (Accounts Payable, etc.)
        if existing_merchant and len(existing_merchant) > 2:
            merchant_lower = existing_merchant.lower().strip()
            is_generic = False
            
            for term in GENERIC_MERCHANT_TERMS:
                if term in merchant_lower or merchant_lower in term:
                    is_generic = True
                    break
            
            if is_generic:
                # Generic term detected - extract REAL merchant from description
                # Look for capitalized company names in description
                merchant = extract_merchant_from_description(description)
                if not merchant or len(merchant) < 3:
                    # Fallback to the generic term but cleaned
                    merchant = extract_merchant_name(existing_merchant)
            else:
                # Not a generic term - use the existing merchant but clean it
                merchant = extract_merchant_name(existing_merchant)
        else:
            # No existing merchant - extract from description
            merchant = extract_merchant_name(description)
        
        # =========================================
        # STRICT MERCHANT VALIDATION
        # =========================================
        
        # Strip any remaining leading numbers/special chars from merchant
        merchant = re.sub(r'^[\d\s\#\*\-\.\,\$\@\!\+\=\/]+', '', merchant).strip()
        
        # Strip leading punctuation/quotes (PDF artifacts)
        merchant = re.sub(r'^[\"\'\:\;\~\(\)\-\.]+', '', merchant).strip()
        
        # If merchant STILL starts with a number after cleaning, DELETE the row
        if merchant and merchant[0].isdigit():
            # Only allow if it's a known brand like "7-Eleven" or "3M"
            if not re.match(r'^\d{1,2}[\-\s]?[A-Za-z]{2,}', merchant):
                skipped_junk += 1
                continue
        
        # =========================================
        # LENGTH LIMIT CHECK (from ultra_cleaner)
        # =========================================
        # Real merchant names are rarely > 45 chars.
        # If longer, it's a disclaimer/footer/text wall.
        if len(merchant) > 45:
            skipped_junk += 1
            continue
        
        # Check if merchant is too short (over-trimmed)
        if len(merchant) < 2:
            # Try to extract from description as fallback
            merchant = extract_merchant_from_description(description)
        
        # Check if merchant has NO letters (e.g., "---" or "12345")
        if not re.search(r'[a-zA-Z]', merchant):
            skipped_junk += 1
            continue
        
        # Final length check
        if len(merchant) < 2:
            skipped_short += 1
            continue
        
        cleaned_rows.append({
            'Merchant_Name': merchant,
            'Transaction_Description': description
        })
        
        # Progress
        if (index + 1) % 500 == 0:
            print(f"   Processed {index + 1} / {initial_count} rows...")
    
    print("-" * 50)
    
    if not cleaned_rows:
        print("❌ No valid data found after cleaning!")
        return
    
    # Create DataFrame
    result_df = pd.DataFrame(cleaned_rows)
    
    # --- STEP 8: Deduplication ---
    before_dedup = len(result_df)
    result_df = result_df.drop_duplicates(subset=['Transaction_Description'])
    after_dedup = len(result_df)
    duplicates_removed = before_dedup - after_dedup
    
    # --- STEP 9: Sort by Merchant Name ---
    result_df = result_df.sort_values(by='Merchant_Name')
    
    # --- STEP 10: Generate Output Path ---
    dir_name = os.path.dirname(file_path)
    base_name = os.path.basename(file_path)
    name_part, _ = os.path.splitext(base_name)
    output_path = os.path.join(dir_name, f"{name_part}_MASTER_CLEAN.xlsx")
    
    # --- STEP 11: Final Sanitization for Excel ---
    # Remove ALL illegal characters that Excel/openpyxl can't handle
    ILLEGAL_CHARS_RE = re.compile(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]')
    
    def sanitize_for_excel(val):
        if isinstance(val, str):
            return ILLEGAL_CHARS_RE.sub('', val)
        return val
    
    result_df = result_df.applymap(sanitize_for_excel)
    
    # Save
    result_df.to_excel(output_path, index=False)
    
    # =========================================
    # SUMMARY
    # =========================================
    
    unique_merchants = result_df['Merchant_Name'].nunique()
    unique_descriptions = result_df['Transaction_Description'].nunique()
    
    print(f"\n{'='*70}")
    print("  ✅ MEGA CLEANING COMPLETE!")
    print(f"{'='*70}")
    
    print(f"\n📊 STATISTICS:")
    print(f"   ├─ Original Rows:       {initial_count:,}")
    print(f"   ├─ Skipped (Empty):     {skipped_empty:,}")
    print(f"   ├─ Skipped (Junk):      {skipped_junk:,}")
    print(f"   ├─ Skipped (Short):     {skipped_short:,}")
    print(f"   ├─ Duplicates Removed:  {duplicates_removed:,}")
    print(f"   ├─ Final Rows:          {after_dedup:,}")
    print(f"   ├─ Unique Merchants:    {unique_merchants:,}")
    print(f"   └─ Unique Descriptions: {unique_descriptions:,}")
    
    print(f"\n💾 Saved to: {output_path}")
    
    # Sample Output
    print(f"\n📋 SAMPLE OUTPUT (first 15 rows):")
    print("-" * 70)
    print(f"   {'MERCHANT':<30} | DESCRIPTION")
    print("-" * 70)
    for idx, row in result_df.head(15).iterrows():
        merch = str(row['Merchant_Name'])[:28].ljust(28)
        desc = str(row['Transaction_Description'])[:35]
        print(f"   {merch} | {desc}")
    print("-" * 70)
    
    # Top Merchants
    print(f"\n🏆 TOP 10 MERCHANTS (by frequency):")
    print("-" * 50)
    top = result_df['Merchant_Name'].value_counts().head(10)
    for merchant, count in top.items():
        print(f"   {str(merchant)[:35].ljust(35)} : {count}")
    print("-" * 50)

# ============================================
# ENTRY POINT
# ============================================

if __name__ == "__main__":
    print("\n" + "="*70)
    print("  🔥 MEGA CLEANER - Ultimate Bank Statement Data Pipeline")
    print("="*70)
    
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
