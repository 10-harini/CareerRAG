from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pypdf import PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv
from google import genai
from pydantic import BaseModel, Field
import chromadb
import os


# --------------------------------
# Load environment variables
# --------------------------------

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY is missing from .env")


# --------------------------------
# Gemini Client
# --------------------------------

client = genai.Client(
    api_key=GEMINI_API_KEY
)


# --------------------------------
# FastAPI
# --------------------------------

app = FastAPI(title="CareerRAG")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------
# Embedding Model
# --------------------------------

embedding_model = SentenceTransformer(
    "all-MiniLM-L6-v2"
)


# --------------------------------
# ChromaDB
# --------------------------------

chroma_client = chromadb.PersistentClient(
    path="backend/vector_db"
)

collection = chroma_client.get_or_create_collection(
    name="career_documents"
)


# --------------------------------
# Home
# --------------------------------

@app.get("/")
def home():

    return {
        "message": "CareerRAG API is running!"
    }


# --------------------------------
# Upload PDF
# --------------------------------

@app.post("/upload")
async def upload_pdf(
    file: UploadFile = File(...),
    document_type: str = "resume"
):

    os.makedirs("data", exist_ok=True)

    file_path = os.path.join(
        "data",
        file.filename
    )

    # Save PDF
    with open(file_path, "wb") as buffer:

        buffer.write(
            await file.read()
        )

    # Extract text
    reader = PdfReader(file_path)

    text = ""

    for page in reader.pages:

        page_text = page.extract_text()

        if page_text:

            text += page_text + "\n"

    # -----------------------------
    # Chunking
    # -----------------------------

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50
    )

    chunks = splitter.split_text(text)

    # -----------------------------
    # Embeddings
    # -----------------------------

    embeddings = embedding_model.encode(
        chunks
    ).tolist()

    # -----------------------------
    # IDs
    # -----------------------------

    document_ids = []

    for i in range(len(chunks)):

        document_ids.append(
            f"{file.filename}_{document_type}_{i}"
        )

    # -----------------------------
    # Store in ChromaDB
    # -----------------------------

    collection.add(

        documents=chunks,

        embeddings=embeddings,

        ids=document_ids,

        metadatas=[
            {
                "filename": file.filename,
                "chunk": i,
                "document_type": document_type
            }
            for i in range(len(chunks))
        ]
    )

    return {

        "filename": file.filename,

        "document_type": document_type,

        "pages": len(reader.pages),

        "text_length": len(text),

        "number_of_chunks": len(chunks),

        "message":
        "PDF embedded and stored successfully!"
    }

# --------------------------------
# Semantic Search
# --------------------------------

@app.get("/search")
def search_documents(
    query: str,
    top_k: int = 3
):

    # Convert question to embedding
    query_embedding = embedding_model.encode(
        [query]
    ).tolist()

    # Search ChromaDB
    results = collection.query(
        query_embeddings=query_embedding,
        n_results=top_k
    )

    documents = results["documents"][0]

    metadatas = results["metadatas"][0]

    retrieved_chunks = []

    for document, metadata in zip(
        documents,
        metadatas
    ):

        retrieved_chunks.append({

            "text": document,

            "filename":
            metadata["filename"],

            "chunk":
            metadata["chunk"]
        })

    return {

        "query": query,

        "results":
        retrieved_chunks
    }


from fastapi import HTTPException


@app.get("/ask")
def ask_question(query: str, top_k: int = 3):
    query = query.strip()

    if not query:
        raise HTTPException(
            status_code=400,
            detail="Please enter a question."
        )

    if not 1 <= top_k <= 10:
        raise HTTPException(
            status_code=400,
            detail="top_k must be between 1 and 10."
        )

    results = collection.query(
    query_embeddings=embedding_model.encode(
        [query]
    ).tolist(),
    n_results=top_k,
    where={"document_type": "resume"}
    )
    documents = (results.get("documents") or [[]])[0]
    metadatas = (results.get("metadatas") or [[]])[0]

    if not documents:
        return {
            "question": query,
            "answer": "I couldn't find that information in the uploaded documents.",
            "sources": []
        }

    context = "\n\n".join(
        f"[Source {i + 1}]\n{document}"
        for i, document in enumerate(documents)
    )

    prompt = f"""
You are CareerRAG, an AI career assistant.

Answer using only the retrieved context.
Do not invent facts.
If the answer is not in the context, say:
"I couldn't find that information in the uploaded documents."

Context:
{context}

User question:
{query}

Give a clear, concise answer.
"""

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )

        answer = getattr(response, "text", None)

        if not answer or not answer.strip():
            raise HTTPException(
                status_code=502,
                detail="Gemini returned an empty answer."
            )

    except HTTPException:
        raise
    except Exception as exc:
        print("Career Chat Gemini error:", repr(exc))
        raise HTTPException(
            status_code=502,
            detail="Gemini is unavailable or its quota is exhausted. Check the backend terminal."
        )

    sources = [
        {
            "source": f"Source {i + 1}",
            "filename": metadata.get("filename", "Unknown document"),
            "chunk": metadata.get("chunk", "Unknown"),
            "text": document
        }
        for i, (document, metadata) in enumerate(
            zip(documents, metadatas)
        )
    ]
    
    return {
        "question": query,
        "answer": answer.strip(),
        "sources": sources
    }
# --------------------------------
# Resume vs Job Description Match
# --------------------------------

@app.get("/match")
def match_resume_with_job():

    import json

    # Step 1: Retrieve resume chunks
    resume_results = collection.get(
        where={"document_type": "resume"},
        include=["documents", "metadatas"]
    )

    resume_documents = resume_results["documents"] or []
    resume_metadatas = resume_results["metadatas"] or []

    # Step 2: Retrieve job description chunks
    jd_results = collection.get(
        where={"document_type": "job-description"},
        include=["documents", "metadatas"]
    )

    jd_documents = jd_results["documents"] or []
    jd_metadatas = jd_results["metadatas"] or []

    # Step 3: Validate uploaded documents
    if not resume_documents:
        return {"error": "No resume found. Upload a resume first."}

    if not jd_documents:
        return {
            "error": "No job description found. Upload a job description first."
        }

    # Step 4: Combine chunks with their source filenames
    resume_text = "\n\n".join(
        f"Source: {metadata.get('filename', 'Unknown resume')}\n{document}"
        for document, metadata in zip(
            resume_documents, resume_metadatas
        )
    )

    jd_text = "\n\n".join(
        f"Source: {metadata.get('filename', 'Unknown job description')}\n{document}"
        for document, metadata in zip(
            jd_documents, jd_metadatas
        )
    )

    # Step 5: Create a strict comparison prompt
    prompt = f"""
You are CareerRAG, a resume-to-job matching assistant.

Compare the resume with the job description.

RESUME:
{resume_text}

JOB DESCRIPTION:
{jd_text}

Rules:
1. Use only evidence explicitly present in the resume.
2. Do not infer skills from the candidate's degree,
   job title, certifications, or other unrelated skills.
3. A skill is matching only if it is explicitly supported
   by the resume and required or preferred by the job description.
4. Put important job skills not explicitly supported by
   the resume in missing_skills.
5. Do not claim that a missing skill means the candidate
   definitely does not know it. It means the resume does
   not provide clear evidence for it.
6. match_percentage is an approximate assessment based on
   explicitly evidenced job requirements. It is not a
   scientifically measured probability.
7. Give concise, evidence-based recommendations.
8. Return JSON only, matching the required schema.

Required JSON schema:
{{
  "match_percentage": 0,
  "matching_skills": [
    {{
      "skill": "Python",
      "evidence": "Brief exact or faithful resume evidence"
    }}
  ],
  "missing_skills": [
    {{
      "skill": "Docker",
      "reason": "No explicit evidence in the resume"
    }}
  ],
  "explanation": "Brief comparison summary",
  "recommendations": [
    "Specific next step for the candidate"
  ]
}}
"""

    # Step 6: Request structured JSON from Gemini
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config={
            "response_mime_type": "application/json"
        }
    )

    # Step 7: Parse and validate the JSON
    try:
        result = json.loads(response.text)
    except (json.JSONDecodeError, TypeError):
        return {
            "error": "The AI returned an invalid response. Please try again."
        }

    # Step 8: Return structured data
    return result


# --------------------------------
# Skill Gap Analysis
# --------------------------------

@app.get("/skill-gap")
def skill_gap_analysis():
    import json

    # Step 1: Retrieve resume chunks
    resume_results = collection.get(
        where={"document_type": "resume"},
        include=["documents", "metadatas"]
    )
    resume_documents = resume_results.get("documents") or []

    # Step 2: Retrieve job description chunks
    jd_results = collection.get(
        where={"document_type": "job-description"},
        include=["documents", "metadatas"]
    )
    jd_documents = jd_results.get("documents") or []

    # Step 3: Validate documents
    if not resume_documents:
        return {"error": "No resume found. Upload a resume first."}

    if not jd_documents:
        return {
            "error": "No job description found. Upload a job description first."
        }

    # Step 4: Combine chunks
    resume_text = "\n\n".join(resume_documents)
    jd_text = "\n\n".join(jd_documents)

    # Step 5: Build the prompt
    prompt = f"""
You are CareerRAG, a practical career mentor.

Compare the resume with the job description.

RESUME:
{resume_text}

JOB DESCRIPTION:
{jd_text}

Identify important job-related skills that are not clearly
demonstrated in the resume.

Rules:
1. Use only the provided resume as evidence.
2. Do not infer skills from a degree or unrelated experience.
3. A gap means the resume lacks clear evidence; it does not
   prove the candidate lacks that skill.
4. Include only relevant, meaningful job-related gaps.
5. Do not repeat skills or list the same skill under synonyms.
6. Prioritize gaps by job importance.
7. Recommend practical learning actions and project exercises.
8. Keep recommendations realistic for a fresher.
9. Do not invent experience or qualifications.
10. Return valid JSON only.

Required JSON structure:
{{
  "skill_gaps": [
    {{
      "skill": "RAG pipelines",
      "priority": "High",
      "reason": "Not clearly evidenced in the resume",
      "learning_action": "Learn chunking, embeddings, retrieval, and grounded generation",
      "practice_task": "Build a question-answering app over PDF documents"
    }}
  ],
  "summary": "Short overall assessment"
}}

Priority must be High, Medium, or Low.
Return skill_gaps as an array and summary as a string.
"""

    # Step 6: Request and parse Gemini JSON
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config={"response_mime_type": "application/json"}
        )

        result = json.loads(response.text)

    except (json.JSONDecodeError, TypeError, ValueError):
        return {
            "error": "The AI returned invalid JSON. Please try again."
        }
    except Exception as exc:
        print(f"Skill gap analysis failed: {exc}")
        return {
            "error": "Skill gap analysis failed. Check the backend terminal for details."
        }

    # Step 7: Validate response format
    if (
        not isinstance(result, dict)
        or not isinstance(result.get("skill_gaps"), list)
        or not isinstance(result.get("summary"), str)
    ):
        return {"error": "The AI returned an unexpected response format."}

    # Step 8: Validate, normalize, and deduplicate gaps
    clean_gaps = []
    seen_skills = set()
    allowed_priorities = {"high", "medium", "low"}

    for gap in result["skill_gaps"]:
        if not isinstance(gap, dict):
            continue

        skill = gap.get("skill")
        if not isinstance(skill, str) or not skill.strip():
            continue

        key = " ".join(skill.casefold().split())
        if key in seen_skills:
            continue
        seen_skills.add(key)

        priority = gap.get("priority", "Medium")
        if not isinstance(priority, str):
            priority = "Medium"
        if priority.casefold() not in allowed_priorities:
            priority = "Medium"
        else:
            priority = priority.capitalize()

        clean_gaps.append({
            "skill": skill.strip(),
            "priority": priority,
            "reason": str(
                gap.get("reason") or "Not clearly evidenced in the resume"
            ).strip(),
            "learning_action": str(
                gap.get("learning_action") or "Review the relevant skill and practice it"
            ).strip(),
            "practice_task": str(
                gap.get("practice_task") or "Complete a small practical project"
            ).strip()
        })

    # Keep the response schema expected by the frontend
    return {
        "skill_gaps": clean_gaps,
        "summary": result["summary"].strip()
    }



@app.get("/roadmap")
def generate_learning_roadmap():
    import json

    # Step 1: Retrieve resume chunks
    resume_results = collection.get(
        where={"document_type": "resume"},
        include=["documents", "metadatas"]
    )
    resume_documents = resume_results.get("documents") or []

    # Step 2: Retrieve job description chunks
    jd_results = collection.get(
        where={"document_type": "job-description"},
        include=["documents", "metadatas"]
    )
    jd_documents = jd_results.get("documents") or []

    # Step 3: Validate documents
    if not resume_documents:
        return {"error": "No resume found. Upload a resume first."}

    if not jd_documents:
        return {
            "error": "No job description found. Upload a job description first."
        }

    # Step 4: Combine document chunks
    resume_text = "\n\n".join(resume_documents)
    jd_text = "\n\n".join(jd_documents)

    # Step 5: Create the roadmap prompt
    prompt = f"""
You are CareerRAG, an AI career learning mentor.

Create a realistic learning roadmap for a fresher.

RESUME:
{resume_text}

JOB DESCRIPTION:
{jd_text}

Instructions:
1. Prioritize job-relevant skills not clearly demonstrated in the resume.
2. Missing evidence does not prove the candidate lacks a skill.
3. Start with fundamentals and progress to practical projects.
4. Every roadmap step must have a learning objective and exercise.
5. Include realistic estimated hours for each step.
6. Keep the plan concise and suitable for a fresher.
7. Do not promise employment or guaranteed results.
8. Use sequential week numbers starting at 1.
9. estimated_total_hours must equal the sum of step hours.
10. Return valid JSON only.

Required structure:
{{
  "target_role": "AI/ML Engineer Fresher",
  "estimated_total_hours": 30,
  "roadmap": [
    {{
      "week": 1,
      "skill": "pandas and NumPy",
      "learning_objective": "Learn data cleaning and manipulation",
      "estimated_hours": 6,
      "practice_task": "Analyse a CSV dataset using pandas",
      "completion_criteria": "Clean the dataset and explain key findings"
    }}
  ],
  "final_project": {{
    "title": "AI/ML Career Project",
    "description": "A practical project combining the learned skills"
  }}
}}

Ensure every roadmap step contains all six required fields.
"""

    # Step 6: Generate and parse structured JSON
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config={"response_mime_type": "application/json"}
        )
        result = json.loads(response.text)

    except (json.JSONDecodeError, TypeError, ValueError):
        return {
            "error": "The AI returned invalid roadmap data. Please try again."
        }
    except Exception as exc:
        print(f"Roadmap generation failed: {exc}")
        return {
            "error": "Roadmap generation failed. Check the backend terminal for details."
        }

    # Step 7: Validate the response structure
    if not isinstance(result, dict):
        return {"error": "The AI returned an unexpected roadmap format."}

    roadmap = result.get("roadmap")
    final_project = result.get("final_project")

    if (
        not isinstance(result.get("target_role"), str)
        or not isinstance(roadmap, list)
        or not roadmap
        or not isinstance(final_project, dict)
    ):
        return {"error": "The AI returned an incomplete roadmap. Please try again."}

    # Step 8: Validate steps and calculate total hours
    clean_roadmap = []
    total_hours = 0

    required_fields = (
        "week",
        "skill",
        "learning_objective",
        "estimated_hours",
        "practice_task",
        "completion_criteria"
    )

    for index, step in enumerate(roadmap, start=1):
        if not isinstance(step, dict):
            continue

        if not all(
            field in step and step[field] is not None
            for field in required_fields
        ):
            continue

        try:
            hours = float(step["estimated_hours"])
        except (ValueError, TypeError):
            continue

        if hours <= 0:
            continue

        try:
            week = int(step["week"])
        except (ValueError, TypeError):
            week = index

        clean_roadmap.append({
            "week": week if week > 0 else index,
            "skill": str(step["skill"]).strip(),
            "learning_objective": str(step["learning_objective"]).strip(),
            "estimated_hours": hours,
            "practice_task": str(step["practice_task"]).strip(),
            "completion_criteria": str(step["completion_criteria"]).strip()
        })

        total_hours += hours

    if not clean_roadmap:
        return {
            "error": "No valid roadmap steps were returned. Please try again."
        }

    if not isinstance(final_project.get("title"), str) or not isinstance(
        final_project.get("description"), str
    ):
        return {"error": "The AI returned an incomplete final project."}

    # Step 9: Return frontend-compatible data
    return {
        "target_role": result["target_role"].strip(),
        "estimated_total_hours": round(total_hours, 2),
        "roadmap": clean_roadmap,
        "final_project": {
            "title": final_project["title"].strip(),
            "description": final_project["description"].strip()
        }
    }


# --------------------------------
# AI Interview Question Generator
# --------------------------------

@app.get("/interview-questions")
def generate_interview_questions():

    import json

    # Step 1: Retrieve resume
    resume_results = collection.get(
        where={"document_type": "resume"},
        include=["documents", "metadatas"]
    )

    resume_documents = resume_results["documents"] or []
    resume_metadatas = resume_results["metadatas"] or []

    # Step 2: Retrieve job description
    jd_results = collection.get(
        where={"document_type": "job-description"},
        include=["documents", "metadatas"]
    )

    jd_documents = jd_results["documents"] or []
    jd_metadatas = jd_results["metadatas"] or []

    # Step 3: Validate documents
    if not resume_documents:
        return {"error": "Upload a resume first."}

    if not jd_documents:
        return {"error": "Upload a job description first."}

    # Step 4: Combine document chunks
    resume_text = "\n\n".join(
        f"Source: {metadata.get('filename', 'Unknown resume')}\n{document}"
        for document, metadata in zip(
            resume_documents, resume_metadatas
        )
    )

    jd_text = "\n\n".join(
        f"Source: {metadata.get('filename', 'Unknown job description')}\n{document}"
        for document, metadata in zip(
            jd_documents, jd_metadatas
        )
    )

    # Step 5: Create prompt
    prompt = f"""
You are CareerRAG, an AI interview coach.

Generate interview practice questions using the resume
and job description provided below.

RESUME:
{resume_text}

JOB DESCRIPTION:
{jd_text}

Rules:
1. Generate 5 technical questions.
2. Generate 3 questions about projects and resume experience.
3. Generate 2 behavioral questions.
4. Include a concise sample answer for each question.
5. Base resume-specific answers only on explicit resume evidence.
6. Do not invent the candidate's experience or achievements.
7. For questions about unfamiliar skills, provide a sample
   answer that honestly explains what the candidate knows
   and what they are still learning.
8. Keep questions suitable for a fresher.
9. Return valid JSON only.

Use this JSON structure:
{{
  "target_role": "AI/ML Engineer Fresher",
  "questions": [
    {{
      "category": "Technical",
      "question": "What is the difference between AI and ML?",
      "sample_answer": "AI is the broader field of building systems..."
    }}
  ]
}}
"""

    # Step 6: Generate structured output
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config={
            "response_mime_type": "application/json"
        }
    )

    # Step 7: Parse JSON safely
    try:
        result = json.loads(response.text)
    except (json.JSONDecodeError, TypeError):
        return {
            "error": "The AI returned invalid JSON. Please try again."
        }

    # Step 8: Return questions
    return result


# --------------------------------
# Interview Answer Evaluation
# --------------------------------

class InterviewAnswer(BaseModel):
    question: str = Field(min_length=1, max_length=2000)
    answer: str = Field(min_length=1, max_length=10000)



@app.post("/evaluate-answer")
def evaluate_interview_answer(data: InterviewAnswer):

    import json

    prompt = f"""
You are CareerRAG, a supportive technical interview coach
for fresher candidates.

Evaluate the candidate's answer fairly and constructively.

QUESTION:
{data.question}

CANDIDATE ANSWER:
{data.answer}

Instructions:
1. Give a score from 0 to 10.
2. Keep strengths to a maximum of 2 short bullet points.
3. Keep improvements to a maximum of 3 short bullet points.
4. Keep feedback to 1 or 2 short sentences.
5. Keep sample_answer between 40 and 60 words.
6. Use simple English suitable for a fresher interview.
7. Make sample_answer easy to speak in 20–30 seconds.
8. Include only essential points and one relevant example if needed.
9. Never use placeholders such as [mention your project].
10. Avoid repetition and lengthy explanations.
11. Keep every response field concise.

Return valid JSON only in this format:
{{
    "score": 7,
    "strengths": [
        "Correctly explains the main concept"
    ],
    "improvements": [
        "Add one practical example"
    ],
    "feedback": "A good start. Add a practical example to improve your answer.",
    "sample_answer": "A short, clear, technically correct interview answer."
}}
"""

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config={
                "response_mime_type": "application/json"
            }
        )

        result = json.loads(response.text)

        score = result.get("score")

        if (
            isinstance(score, bool)
            or not isinstance(score, (int, float))
            or not 0 <= score <= 10
        ):
            return {
                "error": "The AI returned an invalid score."
            }

        return result

    except (json.JSONDecodeError, TypeError, ValueError):
        return {
            "error": "The AI returned an invalid response. Please try again."
        }

    except Exception:
        return {
            "error": "Unable to evaluate the answer right now. Please try again."
        }
