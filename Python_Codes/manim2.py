#!/usr/bin/env python3
"""
Smart Scribes - Ultimate Manim Animation System
Combines multi-agent architecture with detailed prompt engineering.

Supports AWS Bedrock (Claude) and Google Gemini via llm_provider.
"""

import os
import sys
import json
import subprocess
import tempfile
import shutil
import re
from pathlib import Path
from dotenv import load_dotenv
import traceback

from llm_provider import generate_fast, generate_pro, safe_json

load_dotenv()

class SmartScribesUltimateAgent:
    """
    Ultimate Production System
    - Fast model for quick analysis
    - Pro model for detailed prompt creation and high-quality code generation
    - 60-second professional animations
    """

    def __init__(self):
        """Initialize animation agent."""
        self.safety_settings = [
            {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_ONLY_HIGH"},
            {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_ONLY_HIGH"},
            {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_ONLY_HIGH"},
            {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_LOW_AND_ABOVE"},
        ]

        self.manim_executable = os.getenv('MANIM_EXECUTABLE', 'manim')
        self.output_dir = Path('smart_scribes_animations')
        self.output_dir.mkdir(exist_ok=True)

        print("✅ Smart Scribes Ultimate Agent initialized!")
        print("   🚀 Analysis: Fast model")
        print("   🧠 Prompt Creation: Pro model")
        print("   🎨 Code Generation: Pro model")
        print(f"   📁 Output: {self.output_dir}")

    def analyze_lecture_content(self, file_path):
        """Fast analysis with Flash/Haiku model"""
        print(f"\n🧠 Analyzing: {file_path}")

        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        print(f"   Size: {len(content)} chars")
        print("   🚀 Using fast model...")

        analysis = self._try_llm_analysis(content)

        if analysis:
            print("   ✅ Analysis successful!")
            return analysis

        print("   ⚠️ Using heuristics")
        analysis = self._heuristic_analysis(content)
        print("   ✅ Complete!")

        return analysis

    def _try_llm_analysis(self, content):
        """Fast analysis using the configured LLM provider."""
        safe_content = content

        prompt = f"""get topics from the content provided below
CONTENT:
{safe_content}

Return JSON:
{{"topics": ["Topic 1", "Topic 2", "Topic 3"]}}

ONLY JSON."""

        for attempt in range(2):
            try:
                text = generate_fast(prompt, temperature=0.3, max_tokens=1000)
                json_text = self._extract_json(text)
                data = json.loads(json_text)

                if 'topics' in data and data['topics']:
                    return self._build_analysis(data['topics'], content)

            except:
                continue

        return None

    def _build_analysis(self, topic_names, content):
        """Build analysis"""
        animations = []

        for i, topic in enumerate(topic_names[:8], 1):
            animations.append({
                'title': topic,
                'topic': topic,
                'duration_estimate': '60 seconds',
                'priority': 'high' if i <= 3 else 'medium'
            })

        return {
            'analysis_summary': {
                'total_topics': len(topic_names),
                'topics_needing_animation': len(animations)
            },
            'animations_to_create': animations
        }

    def _heuristic_analysis(self, content):
        """Fallback heuristic"""
        topics = []
        lines = content.split('\n')

        for line in lines[:200]:
            if line.strip().startswith('##'):
                topic = line.replace('#', '').strip()
                topic = re.sub(r'\(.*?\)', '', topic).strip()
                if 10 < len(topic) < 100:
                    topics.append(topic)
            elif re.match(r'^\d+\.\s+[A-Z]', line.strip()):
                topic = re.sub(r'^\d+\.\s+', '', line.strip())
                topic = re.sub(r'\(.*?\)', '', topic).strip()
                if 10 < len(topic) < 100:
                    topics.append(topic)

        if not topics:
            topics = ['Main Concept', 'Key Principles', 'Applications']

        return self._build_analysis(topics[:8], content)

    def _extract_json(self, text):
        """Extract JSON"""
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0]
        elif "```" in text:
            text = text.split("```")[1].split("```")[0]

        first = text.find('{')
        last = text.rfind('}')
        if first != -1 and last != -1:
            return text[first:last+1]

        return text.strip()

    def create_detailed_animation_prompt(self, topic):
        """
        AGENT 1: Create super detailed animation prompt using Pro model.
        This generates a rich, detailed description of what to animate.
        """
        print(f"   🧠 Creating detailed prompt with Pro model...")
        
        prompt = f"""You are an expert animation director creating a detailed animation.

TOPIC: {topic}

Create a comprehensive, detailed animation plan with:

Make it in terms of manim functionality and provide instructions on by one make sure the animation works smooth and explain main concept only not too long 

Provide specific details like:
- Exact shapes (Circle, Square, Arrow, Triangle, Dot, Line)
- Specific colors (BLUE, GREEN, RED, YELLOW, PURPLE, ORANGE, PINK, WHITE)
- Animation types (Write, FadeIn, Transform, Create, Rotate, Scale, Move)
- Timing for each element
- Text content for labels
- Spatial positioning
-limit output chars to 8000

Return detailed step-by-step description, be very specific!"""

        try:
            detailed_prompt = generate_pro(prompt, temperature=0.7)
            if detailed_prompt:
                print(detailed_prompt)
                print(f"   ✅ Created detailed prompt ({len(detailed_prompt)} chars)")
                return detailed_prompt
            
        except Exception as e:
            print(f"   ⚠️ Prompt creation failed: {str(e)[:60]}")
        
        # Fallback: structured prompt
        return self._create_fallback_prompt(topic)

    def _create_fallback_prompt(self, topic):
        """Fallback structured prompt"""
        return f"""Create 60-second educational animation for: {topic}

STRUCTURE:
1. Opening (5s): Show title "{topic}" with fade-in animation
2. Introduction (10s): Display main concept with circle visual
3. Section 1 (12s): First key point with square, transform to circle
4. Section 2 (12s): Second key point with arrow animation
5. Section 3 (10s): Third key point with multiple shapes
6. Demonstration (8s): Show practical example with transformation
7. Conclusion (3s): Summary with "Key Concept" text

Use smooth transitions, clear colors, educational style."""

    def generate_manim_code(self, topic, detailed_prompt):
        """
        AGENT 2: Generate high-quality Manim code from detailed prompt.
        """
        print(f"   🎨 Generating code with Pro model...")
        
        code_prompt = f"""You are an expert Manim Python developer creating a professional educational animation.

ANIMATION TOPIC: {topic}
Take special care of overwriting in the animation 

DETAILED ANIMATION PLAN:
{detailed_prompt}


 Colors: BLUE, GREEN, RED, YELLOW, PURPLE, ORANGE, PINK, WHITE, GRAY

 Structure:
   - Title screen: 3 seconds
   - Branding: Persistent in corner
   - Main content: Follow detailed plan timing
   - Total: ~60 seconds
   
 Make it educational, smooth, professional

Return ONLY complete Python code. No markdown. No explanations. Just code."""

        for attempt in range(3):
                if attempt > 0:
                    import time
                    time.sleep(2)
                    print(f"      ⏳ Retry {attempt}/3...")
                
                try:
                    code = generate_pro(code_prompt, temperature=0.3)
                except Exception as e:
                    print(f"      ⚠️ Generation failed: {str(e)[:60]}")
                    continue
                
                if not code:
                    continue
                
                # Clean code
                if "```python" in code:
                    code = code.split("```python")[1].split("```")[0]
                elif "```" in code:
                    code = code.split("```")[1].split("```")[0]
                code = code.strip()
                
                # Inject topic
                safe_topic = topic[:40].replace('"', "'")
                code = code.replace('Educational Concept', safe_topic)
                code = code.replace('Main Topic', safe_topic)
                code = code.replace('Title Here', safe_topic)
                
                return code
        return None
    
    def get_manim_correction_suggestions(self, code: str) -> str:
        """
        Use LLM to analyze Manim code and suggest corrections.
        """
        prompt = f"""
        You are an expert Manim animation and python developer.
        A user has provided the following Manim script, which may be broken or incomplete.

        Your task is to analyze this code and provide a clear, concise list
        of modifications and corrections . Take special care of overwriting in the animation 
        
        Focus on:
        1.  Correcting syntax errors or logical bugs.
        2.  Adding missing constructs (imports, Scene class, construct method, etc.).
        3.  Sequencing overlapping or abrupt animations to be smooth and elegant.
        4.  Ensuring no MathTex or Tex() is used, suggesting simple Text() replacements.
        5.  Improving the overall structure and flow.
        
        IMPORTANT: Do NOT return the corrected code. Only return the textual
        description of the changes you would make.

        Input Code:
        ```python
        {code}
        ```
        
        Corrections and Suggestions:
        """

        try:
            suggestions = generate_fast(prompt, temperature=0.3)
            return suggestions.strip()
        except Exception as e:
            print(f"Error generating suggestions: {e}")
            return f"Error: Could not get suggestions. {e}"

    def apply_manim_corrections(self, original_code: str, suggestions: str) -> str:
        """
        Use LLM to apply suggested corrections to Manim code.
        """
        prompt = f"""
        You are an expert Manim animation developer.
        Your task is to correct and beautify a Manim script based on a set of suggestions.

        You will be given the original (possibly broken) code and a list of
        corrections. You must apply these corrections to produce a final,
        complete, and runnable Manim script.
        Ensure the final output runs **without any TypeErrors or deprecation issues** in the latest Manim Community Edition.
        NEVER USE MathTex or Tex (Latex)
        .add_coordinates()
        

        Original Code:
        ```python
        {original_code}
        ```

        Corrections and Suggestions to Apply:
        ```
        {suggestions}
        ```
        
        Corrected Code:
        """

        try:
            corrected_code = generate_pro(prompt, temperature=0.3)
            corrected_code = corrected_code.strip()

            # Clean up markdown fences
            match = re.search(r"```python\s*(.*?)\s*```", corrected_code, re.DOTALL)
            if match:
                corrected_code = match.group(1).strip()
            else:
                match = re.search(r"```\s*(.*?)\s*```", corrected_code, re.DOTALL)
                if match:
                    corrected_code = match.group(1).strip()
            
            return corrected_code
        except Exception as e:
            print(f"Error applying corrections: {e}")
            return f"Error: Could not generate corrected code. {e}"
    
    def execute_manim_code(self, code, output_name):
        """Execute Manim code"""
        print(f"      🎬 Rendering (2-3 min)...")

        try:
            with tempfile.TemporaryDirectory() as temp_dir:
                script = os.path.join(temp_dir, "scene.py")

                # Static analysis: Prevent malicious imports or shell executions
                forbidden_patterns = [
                    r'import\s+os', r'import\s+sys', r'import\s+subprocess', r'import\s+pty',
                    r'__import__', r'eval\(', r'exec\(', r'open\(', r'pty\.', r'os\.', r'subprocess\.'
                ]
                for pattern in forbidden_patterns:
                    if re.search(pattern, code):
                        print(f"      ❌ Security Error: Generated code contains forbidden pattern '{pattern}'")
                        return {"success": False, "error": f"Security violation: {pattern}"}

                with open(script, "w", encoding='utf-8') as f:
                    f.write(code)

                result = subprocess.run(
                    [self.manim_executable, "-pqh", script, "AnimationScene"],
                    capture_output=True,
                    text=True,
                    cwd=temp_dir,
                    timeout=180
                )

                if result.returncode == 0:
                    # Find video
                    media_dir = os.path.join(temp_dir, "media", "videos")
                    videos = []
                    
                    for root, dirs, files in os.walk(media_dir):
                        for f in files:
                            if f.endswith('.mp4'):
                                videos.append(os.path.join(root, f))

                    if videos:
                        src = max(videos, key=os.path.getsize)
                        dest = self.output_dir / f"{output_name}.mp4"
                        shutil.copy2(src, dest)
                        print(f"      ✅ Video: {dest.name}")
                        return {"success": True, "file": str(dest)}

                error_lines = result.stderr.split('\n')
                print(f"      ❌ Error:")
                for line in error_lines[-5:]:
                    if line.strip():
                        print(f"         {line[:60]}")
                return {"success": False, "error": result.stderr[-300:]}

        except Exception as e:
            print(f"      ❌ Error: {str(e)[:80]}")
            return {"success": False, "error": str(e)}

    def generate_animations_from_lecture(self, lecture_file):
        """Main pipeline"""

        print("\n" + "="*80)
        print("  🎬 SMART SCRIBES - ULTIMATE SYSTEM")
        print("  Detailed Prompts + Pro Code Generation")
        print("="*80)

        analysis = self.analyze_lecture_content(lecture_file)

        with open('lecture_analysis.json', 'w', encoding='utf-8') as f:
            json.dump(analysis, f, indent=2)

        animations = analysis.get('animations_to_create', [])

        if not animations:
            print("\n⚠️ No animations")
            return {"success": True, "animations": []}

        print(f"\n📋 Plan (60s each):")
        for i, p in enumerate(animations, 1):
            print(f"{i}. {p['title']}")

        

        print(f"\n🎬 Creating...")
        results = []

        for i, plan in enumerate(animations, 1):
            print(f"\n{'='*80}")
            print(f"Animation {i}/{len(animations)}: {plan['title'][:50]}")
            print(f"{'='*80}")

            # Step 1: Create detailed prompt
            detailed_prompt = self.create_detailed_animation_prompt(plan['title'])
            
            # Step 2: Generate code from detailed prompt
            code1 = self.generate_manim_code(plan['title'], detailed_prompt)
            print(code1)
            print("code")
            suggestions = self.get_manim_correction_suggestions(code1)
            code = self.apply_manim_corrections(code1, suggestions)


            if not code:
                print("   ❌ Failed")
                continue

            # Save
            name = f"anim_{i:02d}_{plan['title'][:25].lower().replace(' ', '_')}"
            name = re.sub(r'[^a-zA-Z0-9_]', '_', name)
            code_file = self.output_dir / f"{name}.py"

            with open(code_file, 'w', encoding='utf-8') as f:
                f.write(code)
            print(f"   💾 Code: {code_file.name}")

            # Render
            render_result = self.execute_manim_code(code, name)

            results.append({
                'index': i,
                'title': plan['title'],
                'success': render_result['success'],
                'video': render_result.get('file'),
                'code': str(code_file),
                'duration': '60 seconds'
            })

        # Summary
        success = sum(1 for r in results if r['success'])

        print(f"\n{'='*80}")
        print(f"📊 Summary:")
        print(f"   Success: {success}/{len(results)}")
        print(f"   Output: {self.output_dir}/")
        print(f"{'='*80}")

        with open('results.json', 'w') as f:
            json.dump(results, f, indent=2)

        return {"success": True, "animations": results}
