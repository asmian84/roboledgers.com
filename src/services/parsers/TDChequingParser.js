import { BaseBankParser } from './BaseBankParser.js';

export class TDChequingParser extends BaseBankParser {
    constructor() {
        const formatRules = `
TD CHEQUING FORMAT (Business Chequing Account):
- Header: "Statement of Account" with "BUSINESS CHEQUING ACCOUNT - CAD"
- Columns: "DESCRIPTION | CHEQUE/DEBIT | DEPOSIT/CREDIT | DATE | BALANCE"
- Date format: "MMMDD" (e.g., "AUG02", "AUG03", "JUL29") - MonthDay only
- Extract year from "Statement From - To" header (e.g., "JUL 29/22 - AUG 31/22")
- Balance shows "OD" suffix for overdraft (e.g., "19,735.14OD")

PARSING RULES:
- Combine MMMDD with statement year
- Descriptions are uppercase (e.g., "PROC-3333", "BIG BUCKET CAR")
- Transaction codes may appear (e.g., "CHQ#00456-1145063229")
- Remove check numbers (CHQ#XXXXX-XXXXXXXXXX)
- Remove MSP codes
- Keep merchant names clean

KNOWN PATTERNS:
- "PROC-XXXX" + reference → credit (likely direct deposit/payment received)
- "CHQ#" + number → debit (cheque)
- "SEND E-TFR" + code → debit (e-transfer sent)
- "TDMS STMT" → debit (statement fee)
- Merchant names (e.g., "BIG BUCKET CAR", "AUTO VALUE PART") → debit (purchases)
- "MSP" suffix → debit (merchant payment)
- "CARFINCO INC AP" → credit (payment received)
- "SCOTIALN VSA" → credit (loan/credit received)
        `;
        super('TD', 'Chequing', formatRules);
    }
}

export const tdChequingParser = new TDChequingParser();
