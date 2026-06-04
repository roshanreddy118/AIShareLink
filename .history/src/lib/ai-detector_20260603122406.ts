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
            content: `You are a PII (Personally Identifiable Information) detector specialized in Indian documents. 
Analyze the given text and identify ALL sensitive information that should be redacted before sharing.

Focus on:
- Names of individuals
- Addresses (full or partial)
- Dates of birth
- Financial details mentioned in natural language (e.g., "three lakhs per month")
- Any government ID numbers you spot
- Company-specific confidential details (employee IDs, internal codes)
- Signatures or sign-off names

Do NOT flag:
- Generic job titles or department names
- Company name (unless it's a small/private company)
- Dates that aren't birth dates (like offer validity dates)

Respond ONLY with a JSON array. Each item must have:
- "type": category (name, address, financial, id_number, confidential)
- "value": the exact text from the document (must be an exact substring)
- "label": human-readable label
- "reason": why this should be redacted

If no additional PII found beyond obvious patterns, return an empty array [].`,
          },
          {
            role: "user",
            content: `Analyze this document for sensitive PII:\n\n${text.slice(0, 3000)}`,
          },
        ],
        temperature: 0.1,
        max_tokens: 1000,
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
