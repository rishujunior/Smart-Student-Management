import google.generativeai as genai
from app.core.config import settings
from loguru import logger
from typing import Optional, List

# Preference order for auto-detection: fastest/cheapest current models first,
# with older names kept as fallbacks in case a newer one isn't available on a
# given API key yet. Google periodically retires model names (this is what
# broke the previously hardcoded "gemini-1.5-flash"), so the actual model is
# resolved dynamically against the account's live model list instead.
_MODEL_CANDIDATES = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-flash-latest",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
]


class AIService:
    def __init__(self):
        self._configured = False
        self._model = None
        self._model_name: Optional[str] = None

    @property
    def model_name(self) -> str:
        return self._model_name or "not-configured"

    def _resolve_model_name(self) -> str:
        if settings.GEMINI_MODEL:
            return settings.GEMINI_MODEL

        try:
            available = {
                m.name.split("/")[-1]
                for m in genai.list_models()
                if "generateContent" in m.supported_generation_methods
            }
        except Exception as e:
            logger.warning(f"Could not list Gemini models, falling back to default: {e}")
            return _MODEL_CANDIDATES[0]

        for candidate in _MODEL_CANDIDATES:
            if candidate in available:
                return candidate

        # None of our preferred names matched — use whatever flash model is
        # available, or any available model, before giving up.
        flash_models = sorted(m for m in available if "flash" in m)
        if flash_models:
            return flash_models[0]
        if available:
            return next(iter(available))

        return _MODEL_CANDIDATES[0]

    def _configure(self):
        if self._configured or not settings.GEMINI_API_KEY:
            return
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self._model_name = self._resolve_model_name()
        self._model = genai.GenerativeModel(self._model_name)
        self._configured = True

    async def _generate(self, prompt: str) -> str:
        self._configure()
        if not self._model:
            return "AI service is not configured. Please provide a valid GEMINI_API_KEY."
        try:
            response = self._model.generate_content(prompt)
            return response.text
        except Exception as e:
            logger.error(f"Gemini AI error ({self._model_name}): {e}")
            # The resolved model name may itself have just been retired —
            # drop cached config so the next call re-resolves from scratch.
            self._configured = False
            self._model = None
            return f"AI service temporarily unavailable. Error: {str(e)}"

    async def answer_question(self, query: str, context: Optional[str] = None) -> str:
        prompt = f"""You are an expert academic assistant for a student management system.
        
Context: {context or 'General academic query'}

Student Question: {query}

Provide a clear, concise, and helpful academic response. Be encouraging and supportive."""
        return await self._generate(prompt)

    async def generate_questions(self, topic: str, subject: str, difficulty: str, count: int, question_type: str) -> str:
        type_instructions = {
            "mcq": "Generate Multiple Choice Questions with 4 options (A, B, C, D) and mark the correct answer.",
            "short": "Generate short-answer questions (1-2 sentences expected).",
            "long": "Generate long-answer/essay questions.",
            "mixed": "Generate a mix of MCQ, short-answer, and long-answer questions.",
        }

        prompt = f"""You are an expert educator. Generate {count} {difficulty}-level {subject} questions about "{topic}".

Question Type: {type_instructions.get(question_type, type_instructions['mixed'])}

Format each question clearly with numbering. For MCQs, include answer key at the end.
Make questions appropriate for undergraduate engineering students."""
        return await self._generate(prompt)

    async def summarize_notes(self, content: str, max_length: int = 500) -> str:
        prompt = f"""Summarize the following academic content in approximately {max_length} words.
Focus on key concepts, important formulas, and critical points.
Use bullet points where appropriate.

Content:
{content}

Summary:"""
        return await self._generate(prompt)

    async def generate_study_plan(self, weak_subjects: List[str], exam_date: Optional[str], hours_per_day: int) -> str:
        subjects_str = ", ".join(weak_subjects)
        prompt = f"""Create a personalized study plan for a student who needs to improve in: {subjects_str}

Study Schedule Details:
- Available hours per day: {hours_per_day} hours
- Target exam date: {exam_date or 'Not specified (assume 1 month from now)'}

Create a detailed weekly study plan with:
1. Daily time allocation for each subject
2. Topics to cover per week
3. Recommended study resources and techniques
4. Practice problem recommendations
5. Revision strategy for the final week

Make it practical, motivating, and achievable."""
        return await self._generate(prompt)

    async def analyze_performance(self, student_data: dict) -> str:
        prompt = f"""Analyze this student's academic performance and provide insights:

Student: {student_data.get('name', 'Student')}
CGPA: {student_data.get('cgpa', 'N/A')}
Attendance: {student_data.get('attendance', 'N/A')}%
Strong Subjects: {', '.join(student_data.get('strong_subjects', []))}
Weak Subjects: {', '.join(student_data.get('weak_subjects', []))}
Recent Trend: {student_data.get('trend', 'N/A')}

Provide:
1. Performance Analysis (strengths and weaknesses)
2. Risk Assessment (if any)
3. Specific recommendations for improvement
4. Motivational message
5. Career path suggestions based on performance

Be constructive, specific, and encouraging."""
        return await self._generate(prompt)

    async def generate_learning_roadmap(self, subject: str, current_level: str, goal: str) -> str:
        prompt = f"""Create a comprehensive learning roadmap for:

Subject/Technology: {subject}
Current Level: {current_level}
Goal: {goal}

Include:
1. Learning phases (Beginner → Intermediate → Advanced)
2. Key topics for each phase
3. Recommended resources (books, online courses, YouTube channels)
4. Project ideas to build portfolio
5. Estimated timeline
6. Assessment checkpoints
7. Industry certifications to pursue

Make it actionable and specific for an engineering student."""
        return await self._generate(prompt)

    async def recommend_weak_subjects(self, results_data: List[dict]) -> str:
        formatted = "\n".join([
            f"- {r.get('course_name', 'Subject')}: {r.get('percentage', 0):.1f}% (Grade: {r.get('grade', 'N/A')})"
            for r in results_data
        ])

        prompt = f"""Based on this student's performance data, recommend improvement strategies:

{formatted}

Provide:
1. Subjects requiring immediate attention (below 60%)
2. Subjects that can be improved with moderate effort (60-75%)
3. Subject-specific improvement strategies
4. Study tips for each weak subject
5. Time management recommendations

Be specific and actionable."""
        return await self._generate(prompt)


ai_service = AIService()
