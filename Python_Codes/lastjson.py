"""
auto_merge_all_in_one.py
Sends both JSONs (summary + animations) to the LLM.
The LLM merges animations into the correct topics and returns a full JSON.

Supports AWS Bedrock (Claude) and Google Gemini via llm_provider.
"""

import os
import json
import re
from pathlib import Path
from dotenv import load_dotenv

from llm_provider import generate_fast, safe_json

load_dotenv()


def merge_all(summary_path, animations_path, output_path):
    """Send both JSON files to the LLM and get a merged result."""

    # Load both JSON files
    with open(summary_path, "r", encoding="utf-8") as f:
        summary_data = json.load(f)
    with open(animations_path, "r", encoding="utf-8") as f:
        animations = json.load(f)

    prompt = f"""
You are an intelligent data structurer. 
You will receive two JSON datasets: 
1️⃣ A detailed lecture summary (topics, details, questions, references)
2️⃣ A list of animations (title, video path, code, duration)

Your task:
- For each topic in the lecture JSON, find the most relevant animations from the animation JSON.
- If multiple animations fit one topic, include all of them.
- Return ONE final merged JSON in this exact structure:

{{
  "overall_topic": "...",
  "topics": [
    {{
      "topic": "...",
      "details": "...",
      "question": "...",
      "book_references": [...],
      "animations": [
        {{
          "title": "...",
          "video": "...",
          "code": "...",
          "duration": "..."
        }}
      ]
    }}
  ]
}}

Only output the JSON — no explanations, comments, or markdown.
If no animation matches a topic, output an empty array for "animations".

LECTURE SUMMARY:
{json.dumps({"lecture_summary": summary_data}, ensure_ascii=False)}

ANIMATIONS:
{json.dumps({"animations": animations}, ensure_ascii=False)}
"""

    text = generate_fast(prompt, temperature=0.3, max_tokens=8192)

    # Try to extract and parse JSON
    text = text.strip()
    try:
        merged_data = json.loads(text)
    except Exception:
        try:
            json_part = re.search(r"\{.*\}", text, re.S).group()
            merged_data = json.loads(json_part)
        except Exception as e:
            raise ValueError("❌ Could not parse LLM's JSON output.") from e

    # Save merged JSON
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(merged_data, f, indent=2, ensure_ascii=False)

    print(f"✅ Merged JSON saved to: {output_path}")
    print(f"📊 Topics merged: {len(merged_data.get('topics', []))}")
    return merged_data


# Keep old name as alias for backward compatibility
gemini_merge_all = merge_all
init_gemini_client = None  # no longer needed
