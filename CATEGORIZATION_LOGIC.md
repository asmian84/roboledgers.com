# AutoBookkeeping V4 - Categorization Logic

The AutoBookkeeping categorization brain maximizes accuracy (95%+) while minimizing AI costs. It uses a **4-Tier Hybrid System** comprised of **7 Distinct Categorization Types**.

## The 4-Tier Hierarchy
1.  **Tier 1:** Exact Rules & Memory (Zero Cost, 100% Deterministic)
2.  **Tier 2:** Banking Standards (MCC Codes)
3.  **Tier 3:** Algorithms & Heuristics (Fuzzy Match, Keywords)
4.  **Tier 4:** Generative AI (Gemini Fallback)

---

## The 7 Categorization Types

### 1. Exact History Match (Memory)
*   **Mechanism:** Checks the `MerchantDictionary` (IndexedDB) for exact matches of the description.
*   **Logic:** "I've processed 'Staples #123' before, and the user confirmed it's 'Office Supplies'."
*   **Confidence:** **95-100%**
*   **Speed:** Instant (<10ms)

### 2. Master Brand Rules (Global DB)
*   **Mechanism:** Matches against a hardcoded, curated list of major national brands in `MerchantCategorizer`.
*   **Logic:** Regardless of user history, "Starbucks" is always "Meals" and "Adobe" is always "Subscriptions".
*   **Confidence:** **95%**
*   **Note:** Pre-seeded with ~500 common Canadian/US vendors.

### 3. MCC Code Lookup (Banking Standard)
*   **Mechanism:** Uses the 4-digit **Merchant Category Code** provided by the bank export (if available).
*   **Logic:** Code `5812` maps directly to "Restaurants". Code `5541` maps to "Fuel".
*   **Confidence:** **90%** (Reliable, but some vendors use generic codes).

### 4. Regex Patterns (Hardcoded)
*   **Mechanism:** Scans for specific strings, ID patterns, or prefixes using Regular Expressions.
*   **Logic:**
    *   `/subscription|software/i` → Software & Subscriptions
    *   `/#\d{5,}$/` → Strips IDs to find clean names.
*   **Confidence:** **85%**

### 5. Intuition Engine (Keyword Clusters)
*   **Mechanism:** Scans for "topic keywords" when the vendor name is unknown.
*   **Logic:**
    *   Contains "Grill", "Cafe", "Burger" → **Meals**
    *   Contains "Inn", "Suites", "Hotel" → **Travel**
*   **Confidence:** **80%**

### 6. Fuzzy Matching (Algorithmic)
*   **Mechanism:** Uses **Jaro-Winkler** and Levenshtein distance algorithms to find near-matches.
*   **Logic:**
    *   "Home Dpot" is 96% similar to "Home Depot".
    *   "Mcdonalds #99" is 90% similar to "McDonalds".
*   **Confidence:** **75-80%**
*   **Threshold:** Matches >80% similarity are auto-suggested.

### 7. Generative AI (Gemini Flash)
*   **Mechanism:** The Fallback. Sends the description to Google's Gemini 2.0 Flash LLM.
*   **Logic:** "I have no idea what 'X72-B TECH SVS' is."
    *   **AI Deduces:** "Tech Svs" = Technical Services → category: Repairs/Maintenance.
*   **Confidence:** **95%**
*   **Cost:** ~0.1¢ per call (only used when Tiers 1-3 fail).
