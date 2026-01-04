"""
Export ISO 18245 Merchant Category Codes (MCC) to JSON
For integration with JavaScript merchant categorizer
"""
import json
from iso18245 import get_mcc

# Get all MCC codes
mcc_data = {}

# ISO 18245 contains ~500+ MCC codes
# We'll export them in a format useful for our categorizer
for code in range(1, 10000):  # MCC codes are 4 digits
    mcc_str = str(code).zfill(4)
    try:
        info = get_mcc(mcc_str)
        if info:
            mcc_data[mcc_str] = {
                "name": info.get("edited_description", info.get("description", "")),
                "usda_description": info.get("usda_description", ""),
                "irs_description": info.get("irs_description", ""),
                "irs_reportable": info.get("irs_reportable", False)
            }
    except:
        pass

print(f"✅ Extracted {len(mcc_data)} MCC codes")

# Group by category for easier lookup
categories = {
    "Airlines": [],
    "Car Rental": [],
    "Hotels": [],
    "Restaurants": [],
    "Gas Stations": [],
    "Grocery": [],
    "Pharmacies": [],
    "Utilities": [],
    "Telecom": [],
    "Transportation": [],
    "Entertainment": [],
    "Healthcare": [],
    "Professional Services": [],
    "Retail": []
}

# Map MCC codes to our categories
for code, info in mcc_data.items():
    name = info["name"].lower()
    
    if "airline" in name or "aviation" in name:
        categories["Airlines"].append({code: info["name"]})
    elif "car rental" in name or "vehicle rental" in name:
        categories["Car Rental"].append({code: info["name"]})
    elif "hotel" in name or "motel" in name or "lodging" in name:
        categories["Hotels"].append({code: info["name"]})
    elif "restaurant" in name or "eating" in name or "food" in name:
        categories["Restaurants"].append({code: info["name"]})
    elif "gas" in name or "fuel" in name or "service station" in name:
        categories["Gas Stations"].append({code: info["name"]})
    elif "grocery" in name or "supermarket" in name:
        categories["Grocery"].append({code: info["name"]})
    elif "drug" in name or "pharmacy" in name:
        categories["Pharmacies"].append({code: info["name"]})
    elif "electric" in name or "utility" in name or "water" in name:
        categories["Utilities"].append({code: info["name"]})
    elif "telephone" in name or "telecom" in name or "wireless" in name:
        categories["Telecom"].append({code: info["name"]})
    elif "transit" in name or "transportation" in name or "taxi" in name:
        categories["Transportation"].append({code: info["name"]})
    elif "entertainment" in name or "theatre" in name or "recreation" in name:
        categories["Entertainment"].append({code: info["name"]})
    elif "medical" in name or "hospital" in name or "health" in name:
        categories["Healthcare"].append({code: info["name"]})
    elif "professional" in name or "legal" in name or "accounting" in name:
        categories["Professional Services"].append({code: info["name"]})
    else:
        categories["Retail"].append({code: info["name"]})

# Save to JSON
output = {
    "mcc_database": mcc_data,
    "categories": categories,
    "total_codes": len(mcc_data)
}

with open("src/data/mcc-database.json", "w", encoding="utf-8") as f:
    json.dump(output, f, indent=2, ensure_ascii=False)

print(f"✅ Saved MCC database to src/data/mcc-database.json")
print(f"📊 Total categories: {len([c for cat in categories.values() for c in cat])}")
