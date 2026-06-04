import { PIIMatch } from "./pii-detector";

const AI_ENDPOINT = process.env.AI_ENDPOINT || "https://ai-server-lime.vercel.app/api/chat";
const AI_API_KEY = process.env.AI_API_KEY || "my-super-secret-key-change-me";

interface AIDetection {
  type: string;
  value: string;
  label: string;
  reason: string;
}

export async function detectPIIWithAI(text: string): Promise<PIIMatch[]> {
  try {
    const response = await fetch(AI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a PII detector for Indian documents. Find sensitive info that identifies a person.

RULES:
1. Return SMALL, INDIVIDUAL items — NOT large paragraphs
2. Each "value" must be a SHORT specific piece of info (a name, a number, a single address line)
3. NEVER combine multiple items into one. Split them.

Examples of CORRECT values:
- "Mr.N ROSHAN REDDY" (just the name)
- "# 95, 7TH CROSS, SHIVANANDA NAGAR" (one address line)
- "BENGALURU - 560072" (city + pincode)
- "P/141146/01/2023/001201" (policy number)
- "29AAJCS4517L1ZU" (GSTIN)

Examples of WRONG values (too long):
- "Policy Holder Name : Mr.N ROSHAN REDDY Address # 95..." (DO NOT do this)

Detect:
- Person names (each occurrence separately)
- Address parts: house number, street, area, city+pincode (as separate items)
- Policy numbers, GSTIN, account numbers
- Digital certificate details (CN=..., SERIALNUMBER=...)
- Financial amounts specific to a person

Do NOT flag:
- Company names, toll-free numbers, law section numbers
- Generic policy type names ("Family Health Optima")
- Field labels without values ("Policy Holder Name :")
- Countries, regions, continents, or geopolitical areas unless they are part of a street address with a person-specific identifier

IMPORTANT: Find EVERY occurrence of each name in the text.

Respond ONLY with JSON array. Each item:
- "type": name | address | financial | id_number | policy | digital_signature
- "value": EXACT short substring (max 60 chars)
- "label": human-readable label
- "reason": brief reason`,
          },
          {
            role: "user",
            content: `Find ALL PII in this document. Be thorough:\n\n${text.slice(0, 4000)}`,
          },
        ],
        temperature: 0.1,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      console.warn("AI detection failed, falling back to regex only:", response.status);
      return [];
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse JSON from response (handle markdown code blocks)
    let jsonStr = content.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    }

    const detections: AIDetection[] = JSON.parse(jsonStr);

    // Convert AI detections to PIIMatch format by finding positions in text
    const matches: PIIMatch[] = [];
    for (const detection of detections) {
      // Skip items that are too long (AI returned a paragraph instead of a value)
      if (detection.value.length > 80) continue;
      // Skip empty values
      if (!detection.value.trim()) continue;
      if (isNonPersonalGeography(detection)) continue;

      const index = text.indexOf(detection.value);
      if (index !== -1) {
        matches.push({
          type: `ai_${detection.type}`,
          value: detection.value,
          start: index,
          end: index + detection.value.length,
          label: `🤖 ${detection.label}`,
        });

        // Find additional occurrences of the same value
        let nextIndex = text.indexOf(detection.value, index + 1);
        while (nextIndex !== -1) {
          matches.push({
            type: `ai_${detection.type}`,
            value: detection.value,
            start: nextIndex,
            end: nextIndex + detection.value.length,
            label: `🤖 ${detection.label}`,
          });
          nextIndex = text.indexOf(detection.value, nextIndex + 1);
        }
      }
    }

    return matches;
  } catch (error) {
    console.warn("AI PII detection error (falling back to regex):", error);
    return [];
  }
}

function isNonPersonalGeography(detection: AIDetection): boolean {
  const value = detection.value.trim().toLowerCase();
  const type = detection.type.trim().toLowerCase();
  const label = detection.label.trim().toLowerCase();
  const geographyTerms = new Set([
    "china",
    "russia",
    "middle east",
    "asia",
    "europe",
    "africa",
    "north america",
    "south america",
    "australia",
  ]);

  if (geographyTerms.has(value)) return true;
  if ((type.includes("country") || type.includes("region")) && !/\d/.test(value)) {
    return true;
  }
  if ((label.includes("country") || label.includes("region")) && !/\d/.test(value)) {
    return true;
  }

  return false;
}
