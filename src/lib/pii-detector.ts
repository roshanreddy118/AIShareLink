export interface PIIMatch {
  type: string;
  value: string;
  start: number;
  end: number;
  label: string;
}

const PII_PATTERNS: { type: string; label: string; regex: RegExp }[] = [
  // === INDIAN GOVERNMENT IDs ===
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
    type: "voter_id",
    label: "Voter ID (EPIC)",
    regex: /[A-Z]{3}\d{7}/g,
  },
  {
    type: "passport",
    label: "Passport Number",
    regex: /[A-PR-WY][1-9]\d\s?\d{4}[1-9]/g,
  },
  {
    type: "driving_license",
    label: "Driving License",
    regex: /[A-Z]{2}\d{2}\s?\d{4}\s?\d{7}/g,
  },
  {
    type: "ration_card",
    label: "Ration Card Number",
    regex: /(?:RC|ration)\s*(?:no|number|#)?[\s:]*[A-Z0-9]{8,15}/gi,
  },

  // === FINANCIAL ===
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
    type: "upi",
    label: "UPI ID",
    regex: /[a-zA-Z0-9._-]+@(?:ok(?:icici|axis|sbi|hdfc)|ybl|paytm|upi|ibl|apl|freecharge|gpay|phonepe)/g,
  },
  {
    type: "credit_card",
    label: "Credit/Debit Card",
    regex: /\b(?:4\d{3}|5[1-5]\d{2}|6(?:011|5\d{2}))\s?[\d\s]{8,12}\d{1,4}\b/g,
  },
  {
    type: "salary",
    label: "Salary/Amount",
    regex: /(?:₹|INR|Rs\.?|USD|\$|EUR|€)\s?[\d,]+(?:\.\d{1,2})?/g,
  },
  {
    type: "salary_context",
    label: "Salary/Compensation Detail",
    regex: /(?:CTC|gross|net\s?pay|take\s?home|basic|salary|stipend|compensation|premium|total\s?amount|net\s?amount)[\s:]*(?:₹|INR|Rs\.?)?\s?[\d,]+(?:\.\d{2})?/gi,
  },

  // === PERSON NAMES ===
  {
    type: "named_person",
    label: "Person Name",
    regex: /(?:Mr\.|Mrs\.|Ms\.|Miss|Dr\.|Prof\.|Shri|Smt\.?|Sri|Master)\s*[A-Z][A-Z\s.]{2,30}/g,
  },
  {
    type: "name_field",
    label: "Name (from field)",
    regex: /(?:Holder'?s?\s*Name|Proposer\s*Name|Nominee\s*Name|Insured\s*Name|Patient\s*Name|Employee\s*Name|Candidate\s*Name|Applicant\s*Name|Father'?s?\s*Name|Mother'?s?\s*Name|Spouse\s*Name|Guardian\s*Name|Son\/Daughter\s*of)\s*[:]\s*[A-Za-z][A-Za-z\s.]{2,40}/gi,
  },
  {
    type: "dear_name",
    label: "Person Name (Salutation)",
    regex: /(?:Dear)\s+(?:Mr\.|Mrs\.|Ms\.|Dr\.)?\s*[A-Z][A-Za-z\s.]{2,30}/g,
  },

  // === ADDRESS COMPONENTS ===
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
    label: "Street/Road",
    regex: /\d+(?:st|nd|rd|th)\s+(?:cross|main|street|road|floor|block|phase|sector)[^,\n]{0,40}/gi,
  },
  {
    type: "locality",
    label: "Locality/Area",
    regex: /(?:NAGAR|PALYA|PURA|PURAM|HALLI|LAYOUT|COLONY|EXTENSION|POST|STAGE|ENCLAVE|VIHAR|KUNJ|GARDEN|PARK|RESIDENCY|APARTMENTS?|COMPLEX|TOWER|SOCIETY)\b[^,\n]{0,30}/gi,
  },
  {
    type: "flat_door",
    label: "Flat/Door Number",
    regex: /(?:Flat|Door|Plot|House|Room|Unit|Apt)[\s.#:No-]*\d+[A-Za-z]?(?:\/\d+)?/gi,
  },

  // === POLICY & INSURANCE ===
  {
    type: "policy_number",
    label: "Policy Number",
    regex: /[A-Z]\/\d{4,}\/\d+\/\d+\/\d+/g,
  },
  {
    type: "policy_generic",
    label: "Policy/Claim Number",
    regex: /(?:Policy|Claim|Certificate|Reference|Application)\s*(?:No|Number|#|Id)\.?\s*[:]\s*[A-Z0-9\/-]{6,25}/gi,
  },

  // === CONTACT INFO ===
  {
    type: "phone",
    label: "Phone Number",
    regex: /(?:\+91[\s-]?)?[6-9]\d{9}/g,
  },
  {
    type: "phone_landline",
    label: "Landline Number",
    regex: /0\d{2,4}[\s-]?\d{6,8}/g,
  },
  {
    type: "email",
    label: "Email Address",
    regex: /\b[a-zA-Z0-9](?:[a-zA-Z0-9._%+-]{0,62}[a-zA-Z0-9])?@(?:[a-zA-Z](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[A-Za-z]{2,}\b/g,
  },

  // === DATE OF BIRTH ===
  {
    type: "dob",
    label: "Date of Birth",
    regex: /(?:DOB|Date of Birth|D\.O\.B|Born on|Birth\s*Date)[\s:]*\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/gi,
  },
  {
    type: "age",
    label: "Age",
    regex: /(?:Age|Aged?)[\s:]*\d{1,3}\s*(?:years?|yrs?|Y)/gi,
  },

  // === VEHICLE ===
  {
    type: "vehicle_number",
    label: "Vehicle Registration",
    regex: /[A-Z]{2}\s?\d{1,2}\s?[A-Z]{1,3}\s?\d{4}/g,
  },
  {
    type: "chassis_number",
    label: "Chassis/VIN Number",
    regex: /(?:Chassis|VIN|Engine)\s*(?:No|Number|#)?[\s.:]*[A-Z0-9]{10,17}/gi,
  },

  // === EMPLOYMENT ===
  {
    type: "employee_id",
    label: "Employee ID",
    regex: /(?:Employee|Emp|Staff|Badge)\s*(?:ID|No|Number|Code|#)[\s.:]*[A-Z0-9]{4,15}/gi,
  },
  {
    type: "pf_number",
    label: "PF/UAN Number",
    regex: /(?:PF|EPF|UAN|ESI)\s*(?:No|Number|#|Account)?[\s.:]*[A-Z]{2,5}\/?\d{5,}(?:\/\d+)*/gi,
  },

  // === MEDICAL ===
  {
    type: "medical_record",
    label: "Medical Record/MRN",
    regex: /(?:MRN|MR\s*No|Patient\s*ID|UHID|Hospital\s*No|Reg(?:istration)?\s*No)[\s.:]*[A-Z0-9\/-]{4,20}/gi,
  },
  {
    type: "blood_group",
    label: "Blood Group",
    regex: /(?:Blood\s*(?:Group|Type))[\s:]*(?:A|B|AB|O)[+-]/gi,
  },

  // === EDUCATION ===
  {
    type: "roll_number",
    label: "Roll/Registration Number",
    regex: /(?:Roll|Reg(?:istration)?|Enrollment|Admission|Hall\s*Ticket)\s*(?:No|Number|#)[\s.:]*[A-Z0-9\/-]{5,20}/gi,
  },

  // === DIGITAL SIGNATURES ===
  {
    type: "serial_number",
    label: "Serial/Certificate Number",
    regex: /(?:SERIALNUMBER|Serial\s*No)[\s=:]*[A-Fa-f0-9]{10,}/gi,
  },
  {
    type: "digital_sig_cn",
    label: "Digital Signature (CN)",
    regex: /CN\s*=\s*[^,\n]{3,50}/g,
  },
  {
    type: "oid_field",
    label: "OID Field",
    regex: /OID[\s.]*\d[\d.]+\s*=\s*[^,\n]{3,60}/g,
  },

  // === INTERNATIONAL IDs ===
  {
    type: "ssn",
    label: "SSN (US)",
    regex: /\b\d{3}-\d{2}-\d{4}\b/g,
  },
  {
    type: "nino",
    label: "National Insurance (UK)",
    regex: /[A-CEGHJ-PR-TW-Z]{2}\s?\d{2}\s?\d{2}\s?\d{2}\s?[A-D]/g,
  },

  // === IP & DIGITAL ===
  {
    type: "ip_address",
    label: "IP Address",
    regex: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
  },
  {
    type: "mac_address",
    label: "MAC Address",
    regex: /(?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}/g,
  },

  // === TAN / TIN ===
  {
    type: "tan",
    label: "TAN Number",
    regex: /[A-Z]{4}\d{5}[A-Z]/g,
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
