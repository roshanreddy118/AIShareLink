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
    regex: /(?:Mr\.|Mrs\.|Ms\.|Dr\.|Shri|Smt\.?)\s*[A-Z][A-Z\s.]+(?=[,\s]|$)/g,
  },
  {
    type: "name_field",
    label: "Name (from field)",
    regex: /(?:Name|Holder'?s?\s*Name|Proposer|Nominee|Insured)\s*[:]\s*[A-Za-z][A-Za-z\s.]+/gi,
  },
  {
    type: "address_field",
    label: "Address",
    regex: /(?:Address)\s*[:]\s*[^.]*?\d{6}/gi,
  },
  {
    type: "address_block",
    label: "Address",
    regex: /#\s?\d+[^,]*(?:,\s*[^,]+){2,}?\s*\d{6}/g,
  },
  {
    type: "pincode_context",
    label: "Location (Pincode)",
    regex: /(?:BENGALURU|BANGALORE|CHENNAI|MUMBAI|DELHI|HYDERABAD|KOLKATA|PUNE)[^.]*?\d{3}\s?\d{3}/gi,
  },
  {
    type: "policy_number",
    label: "Policy Number",
    regex: /(?:Policy\s*No\.?\s*[:])?\s*[A-Z]\/\d{4,}\/\d+\/\d+\/\d+/gi,
  },
  {
    type: "gstin",
    label: "GSTIN",
    regex: /\d{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z0-9][A-Z0-9]/g,
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
