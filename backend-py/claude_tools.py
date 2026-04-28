import base64
import os

import anthropic
import openai

from schemas import AUDIO_ANALYSIS_SCHEMA, PHOTO_ANALYSIS_SCHEMA, REPORT_SCHEMA

_anthropic_client: anthropic.AsyncAnthropic | None = None
_openai_client: openai.AsyncOpenAI | None = None


def _get_anthropic() -> anthropic.AsyncAnthropic:
    global _anthropic_client
    if _anthropic_client is None:
        _anthropic_client = anthropic.AsyncAnthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    return _anthropic_client


def _get_openai() -> openai.AsyncOpenAI:
    global _openai_client
    if _openai_client is None:
        _openai_client = openai.AsyncOpenAI(api_key=os.environ["OPENAI_API_KEY"])
    return _openai_client


def _claude_model() -> str:
    return os.environ.get("CLAUDE_MODEL", "claude-sonnet-4-6")


def _extract_tool_result(response: anthropic.types.Message) -> dict:
    for block in response.content:
        if block.type == "tool_use":
            return block.input  # type: ignore[return-value]
    raise ValueError("No tool_use block in Claude response")


async def analyze_photos(photos: list[dict]) -> dict:
    """
    photos: list of {"base64": str, "name": str, "type": str, "label": str}
    Returns PhotoAnalysisResult dict.
    """
    client = _get_anthropic()

    image_blocks: list[dict] = []
    for photo in photos:
        media_type = photo.get("type", "image/jpeg")
        image_blocks.append(
            {
                "type": "text",
                "text": f"Photo: {photo.get('label', photo.get('name', 'unknown'))}",
            }
        )
        image_blocks.append(
            {
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": media_type,
                    "data": photo["base64"],
                },
            }
        )

    response = await client.messages.create(
        model=_claude_model(),
        max_tokens=2048,
        system=[
            {
                "type": "text",
                "text": (
                    "You are an expert used-car inspector in India. Analyse the provided inspection "
                    "photos and return a structured JSON result using the photo_analysis_result tool. "
                    "Be thorough but concise. Flag genuine issues — not cosmetic imperfections that "
                    "are normal for used cars. Severity levels: low (minor), medium (needs attention "
                    "soon), high (major concern or safety risk)."
                ),
                "cache_control": {"type": "ephemeral"},
            }
        ],
        messages=[{"role": "user", "content": image_blocks}],
        tools=[PHOTO_ANALYSIS_SCHEMA],
        tool_choice={"type": "tool", "name": "photo_analysis_result"},
    )
    return _extract_tool_result(response)


async def analyze_audio(audio_base64: str, filename: str, mimetype: str) -> dict:
    """
    Transcribe with OpenAI Whisper, then analyse the transcript with Claude.
    Returns {"transcript": str, ...AudioAnalysisResult fields}.
    """
    audio_bytes = base64.b64decode(audio_base64)
    transcribe_model = os.environ.get("OPENAI_TRANSCRIBE_MODEL", "gpt-4o-mini-transcribe")

    transcript = ""
    try:
        oai = _get_openai()
        response = await oai.audio.transcriptions.create(
            file=(filename, audio_bytes, mimetype),
            model=transcribe_model,
            response_format="text",
        )
        transcript = str(response).strip()
    except Exception:
        transcript = ""

    client = _get_anthropic()

    transcript_text = (
        f'Transcript of engine audio recording:\n"""\n{transcript}\n"""'
        if transcript
        else "No audio transcript available — analyse based on typical engine noise patterns."
    )

    response = await client.messages.create(
        model=_claude_model(),
        max_tokens=1024,
        system=[
            {
                "type": "text",
                "text": (
                    "You are an expert automotive technician in India. Analyse the engine audio "
                    "transcript and return a structured JSON result using the audio_analysis_result "
                    "tool. Identify abnormal sounds, possible mechanical causes, and negotiation "
                    "impact. If the transcript is empty or unclear, base your analysis on common "
                    "patterns and mark risk_level as low unless there is specific evidence otherwise."
                ),
                "cache_control": {"type": "ephemeral"},
            }
        ],
        messages=[{"role": "user", "content": transcript_text}],
        tools=[AUDIO_ANALYSIS_SCHEMA],
        tool_choice={"type": "tool", "name": "audio_analysis_result"},
    )

    analysis = _extract_tool_result(response)
    return {"transcript": transcript, **analysis}


async def generate_report(
    details: dict,
    vehicle_api_data: dict,
    photo_analysis: dict,
    structural_checks: list[dict],
    audio_analysis: dict,
) -> dict:
    """Returns FinalReport dict."""
    client = _get_anthropic()

    payload = {
        "carDetails": details,
        "vehicleApiData": vehicle_api_data,
        "photoAnalysis": photo_analysis,
        "structuralChecks": structural_checks,
        "audioAnalysis": audio_analysis,
    }

    import json

    response = await client.messages.create(
        model=_claude_model(),
        max_tokens=4096,
        system=[
            {
                "type": "text",
                "text": (
                    "You are a senior used-car buying advisor in India. Given the full inspection "
                    "data below, produce a comprehensive buying-decision report using the "
                    "inspection_report tool. The score should reflect overall condition (0–100). "
                    "decision must be 'buy' (score ≥ 70, minor issues), 'negotiate' (score 40–69, "
                    "fixable issues), or 'avoid' (score < 40, major structural/safety problems). "
                    "Repair estimates should be realistic INR ranges for Indian workshops. "
                    "Negotiation strategy should be practical and specific."
                ),
                "cache_control": {"type": "ephemeral"},
            }
        ],
        messages=[
            {
                "role": "user",
                "content": f"Inspection data:\n```json\n{json.dumps(payload, indent=2)}\n```",
            }
        ],
        tools=[REPORT_SCHEMA],
        tool_choice={"type": "tool", "name": "inspection_report"},
    )
    return _extract_tool_result(response)
