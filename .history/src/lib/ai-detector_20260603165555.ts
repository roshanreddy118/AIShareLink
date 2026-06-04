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
            content: `You are an aggressive PII detector for Indian documents. Find ALL sensitive info that could identify a person. When in doubt, FLAG IT.

You MUST detect:
- Full names of any individual (e.g., "Mr.N ROSHAN REDDY") — ALL occurrences
- Addresses — house numbers, streets, areas, city + pincode
- Policy numbers, account numbers, registration numbers
- GSTIN numbers
- Digital signature blocks (CN=, OID=, SERIALNUMBER=)
- Phone numbers, emails
- Government IDs (PAN, Aadhaar, Voter ID, Passport)
- Financial amounts tied to a person (premium, salary)
- Branch codes and internal references

Do NOT flag:
- Generic company names or public toll-free numbers
- Section numbers of laws (80D)
- Generic policy type names

CRITICAL: Find EVERY occurrence of a name/address, not just the first.

Respond ONLY with a JSON array. Each item:
- "type": name, address, financial, id_number, policy, digital_signature
- "value": EXACT verbatim substring from the document
- "label": human-readable label
- "reason": brief reason

If nothing found, return [].`,
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
      const index = text.indexOf(detection.value);
      if (index !== -1) {
        matches.push({
          type: `ai_${detection.type}`,
          value: detection.value,
          start: index,
          end: index + detection.value.length,
          label: `🤖 ${detection.label}`,
        });
      }
    }

    return matches;
  } catch (error) {
    console.warn("AI PII detection error (falling back to regex):", error);
    return [];
  }
}
