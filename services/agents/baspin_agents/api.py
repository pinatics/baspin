from fastapi import FastAPI

from .models import QuestionAgentRequest, QuestionAgentResponse
from .question_agent import QuestionAgent

app = FastAPI(
    title="Baspin Agents API",
    version="0.1.0",
    description="Agent endpoints for Baspin business analysis workflows.",
)

_question_agent = QuestionAgent()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/questions/generate", response_model=QuestionAgentResponse)
def generate_questions(request: QuestionAgentRequest) -> QuestionAgentResponse:
    return _question_agent.generate(request)
