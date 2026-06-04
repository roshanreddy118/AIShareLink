export interface PIIMatch {
  type: string;
  value: string;
  start: number;
  end: number;
  label: string;
}

const PII_PATTERNS: { type: string; label: string; regex: RegExp }[] = [
  {
    type: "pan",
    label: "PAN Number",
    regex: /[A-Z]{5}[0-9]{4}[A-Z]/g,
  },
  {
    type: "aadhaar",
    label: "Aadhaar Number",
    regex: /[2-9]\d{3}[\s-]?\d{4}[\s-]?\d{4}/g,
  },
  {
    type: "phone",
    label: "Phone Number",
    regex: /(?:\+91[\s-]?)?[6-9]\d{9}/g,
  },
  {
    type: "email",
    label: "Email Address",
    regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  },
  {
    type: "ifsc",
    label: "IFSC Code",
    regex: /[A-Z]{4}0[A-Z0-9]{6}/g,
  },
  {
    type: "account",
    label: "Bank Account Number",
    regex: /\d{9,18}/g,
  },
  {
    type: "salary",
    label: "Salary/Amount",
    regex: /(?:₹|INR|Rs\.?)\s?[\d,]+(?:\.\d{2})?/g,
  },
  {
    type: "salary_context",
    label: "Salary Detail",
    regex: /(?:CTC|gross|net\s?pay|take\s?home|basic|salary|stipend|compensation)[\s:]*(?:₹|INR|Rs\.?)?\s?[\d,]+(?:\.\d{2})?/gi,
  },
  {
    type: "named_person",
    label: "Person Name",
    regex: /(?:Mr\.|Mrs\.|Ms\.|Dr\.|Shri|Smt\.?)\s*[A-Z][A-Z\s.]{2,30}/g,
  },
  {
    type: "name_field",
    label: "Name (from field)",
    regex: /(?:Holder'?s?\s*Name|Proposer Name|Nominee Name|Insured Name)\s*[:]\s*[A-Za-z][A-Za-z\s.]{2,40}/gi,
  },
  {
    type: "house_number",
    label: "House/Building Number",
    regex: /#\s?\d+[^,\n]{0,50}/g,
  },
  {
    type: "pincode",
    label: "Pincode",
    regex: /\b[1-9]\d{2}\s?\d{3}\b/g,
  },
  {
    type: "street_address",
    label: "Street/Area Name",
    regex: /(?:\d+(?:st|nd|rd|th)\s+(?:cross|main|street|road|floor))[^,\n]{0,40}/gi,
  },
  {
    type: "locality",
    label: "Locality/Area",
    regex: /(?:NAGAR|PALYA|PURA|PURAM|HALLI|LAYOUT|COLONY|EXTENSION|POST|STAGE)\b[^,\n]{0,30}/gi,
  },
  {
    type: "policy_number",
    label: "Policy Number",
    regex: /[A-Z]\/\d{4,}\/\d+\/\d+\/\d+/g,
  },
  {
    type: "gstin",
    label: "GSTIN",
    regex: /\d{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z0-9][A-Z0-9]/g,
  },
  {
    type: "cin",
    label: "Corporate Identity Number (CIN)",
    regex: /[A-Z]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}/g,
  },
  {
    type: "dob",
    label: "Date of Birth",
    regex: /(?:DOB|Date of Birth|D\.O\.B)[\s:]*\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/gi,
  },
  {
    type: "passport",
    label: "Passport Number",
    regex: /[A-Z][1-9]\d{6}[0-9]/g,
  },
  {
    type: "voter_id",
    label: "Voter ID",
    regex: /[A-Z]{3}\d{7}/g,
  },
  {
    type: "upi",
    label: "UPI ID",
    regex: /[a-zA-Z0-9._%+-]+@[a-z]{2,}/g,
  },
];

export function detectPII(text: string): PIIMatch[] {
  const matches: PIIMatch[] = [];
  const seen = new Set<string>();

  for (const pattern of PII_PATTERNS) {
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    let match;

    while ((match = regex.exec(text)) !== null) {
      const key = `${pattern.type}:${match.index}:${match[0]}`;
      if (seen.has(key)) continue;
      seen.add(key);

      // Skip short account numbers that are likely false positives
      if (pattern.type === "account" && match[0].length < 10) continue;

      // Skip UPI IDs that are actually emails (already caught)
      if (pattern.type === "upi" && match[0].includes("@gmail") || 
          pattern.type === "upi" && match[0].includes("@yahoo") ||
          pattern.type === "upi" && match[0].includes("@outlook")) continue;

      matches.push({
        type: pattern.type,
        value: match[0],
        start: match.index,
        end: match.index + match[0].length,
        label: pattern.label,
      });
    }
  }

  // Sort by position and deduplicate overlapping matches
  matches.sort((a, b) => a.start - b.start);
  return deduplicateOverlapping(matches);
}

function deduplicateOverlapping(matches: PIIMatch[]): PIIMatch[] {
  const result: PIIMatch[] = [];
  for (const match of matches) {
    const last = result[result.length - 1];
    if (last && match.start < last.end) {
      // Keep the longer/more specific match
      if (match.end - match.start > last.end - last.start) {
        result[result.length - 1] = match;
      }
    } else {
      result.push(match);
    }
  }
  return result;
}

export function redactText(text: string, matches: PIIMatch[]): string {
  let redacted = text;
  // Process from end to start to preserve indices
  const sorted = [...matches].sort((a, b) => b.start - a.start);
  for (const match of sorted) {
    const replacement = "█".repeat(match.value.length);
    redacted = redacted.slice(0, match.start) + replacement + redacted.slice(match.end);
  }
  return redacted;
}
