import re

# Read the file
with open('src/services/pdf-parser.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Delete lines 1061-1181 (0-indexed: 1060-1180)
del lines[1060:1181]

# Read the fixed BMO function
with open('src/services/pdf-parser-FIXED-BMO.js', 'r', encoding='utf-8') as f:
    fixed_bmo = f.read()

# Insert the fixed function at line 1061 (0-indexed: 1060)
# Add proper indentation and formatting
fixed_lines = []
fixed_lines.append('        /**\n')
fixed_lines.append('         * BMO Bank of Montreal Credit Card Parser\n')
fixed_lines.append('         * Format: TRANS_DATE   POST_DATE   DESCRIPTION   REFERENCE_NO   AMOUNT\n')
fixed_lines.append('         * Example: Mar 8   Mar 8   DIN THE STORE #0405   9301151476406   237.95\n')
fixed_lines.append('         */\n')

# Add the function body from the fixed file (skip the comment header)
for line in fixed_bmo.split('\n')[5:]:  # Skip first 5 lines (comments)
    if line.strip():
        fixed_lines.append('        ' + line + '\n')
    else:
        fixed_lines.append('\n')

# Insert at position 1060
for i, line in enumerate(reversed(fixed_lines)):
    lines.insert(1060, line)

# Write back
with open('src/services/pdf-parser.js', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("✅ BMO parser fixed successfully!")
print("Lines deleted: 1061-1181")
print("Fixed function inserted at line 1061")
