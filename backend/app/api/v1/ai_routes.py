from fastapi import APIRouter, Depends
from app.schemas.misc import AIQueryRequest, GenerateQuestionsRequest, StudyPlanRequest, SummarizeRequest
from app.services.ai_service import ai_service
from app.services.academic_service import result_service
from app.services.user_service import student_service
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/ai", tags=["AI Features"])


@router.post("/ask")
async def ask_question(data: AIQueryRequest, current_user: dict = Depends(get_current_user)):
    """Ask the AI academic assistant a question"""
    response = await ai_service.answer_question(data.query, data.context)
    return {
        "response": response,
        "query": data.query,
        "model_used": ai_service.model_name,
    }


@router.post("/generate-questions")
async def generate_questions(data: GenerateQuestionsRequest, _=Depends(get_current_user)):
    """Generate practice questions for a topic"""
    response = await ai_service.generate_questions(
        data.topic, data.subject, data.difficulty, data.count, data.question_type
    )
    return {"questions": response, "topic": data.topic, "subject": data.subject}


@router.post("/summarize")
async def summarize_notes(data: SummarizeRequest, _=Depends(get_current_user)):
    """Summarize study notes or content"""
    summary = await ai_service.summarize_notes(data.content, data.max_length)
    return {"summary": summary, "original_length": len(data.content)}


@router.post("/study-plan")
async def generate_study_plan(data: StudyPlanRequest, _=Depends(get_current_user)):
    """Generate a personalized study plan"""
    plan = await ai_service.generate_study_plan(
        data.weak_subjects, data.exam_date, data.hours_per_day
    )
    return {"study_plan": plan, "student_id": data.student_id}


@router.get("/analyze/{student_id}")
async def analyze_student_performance(student_id: str, current_user: dict = Depends(get_current_user)):
    """Analyze student performance using AI"""
    student = await student_service._get_student_with_details(student_id)
    results = await result_service.get_student_results(student_id)

    if results:
        strong = [r["course_name"] for r in results if r["percentage"] >= 70]
        weak = [r["course_name"] for r in results if r["percentage"] < 60]
    else:
        strong, weak = [], []

    student_data = {
        "name": student["full_name"] if student else "Student",
        "cgpa": student.get("cgpa", "N/A") if student else "N/A",
        "attendance": student.get("attendance_percentage", "N/A") if student else "N/A",
        "strong_subjects": strong,
        "weak_subjects": weak,
        "trend": "stable",
    }

    analysis = await ai_service.analyze_performance(student_data)
    return {"analysis": analysis, "student_id": student_id}


@router.get("/recommend-subjects/{student_id}")
async def recommend_subject_improvements(student_id: str, _=Depends(get_current_user)):
    """Get AI recommendations for weak subjects"""
    results = await result_service.get_student_results(student_id)
    recommendations = await ai_service.recommend_weak_subjects(results)
    return {"recommendations": recommendations, "student_id": student_id}


@router.post("/learning-roadmap")
async def generate_learning_roadmap(
    subject: str,
    current_level: str = "beginner",
    goal: str = "job-ready",
    _=Depends(get_current_user),
):
    """Generate a personalized learning roadmap"""
    roadmap = await ai_service.generate_learning_roadmap(subject, current_level, goal)
    return {"roadmap": roadmap, "subject": subject}
