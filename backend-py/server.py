import base64
import os

from dotenv import load_dotenv

load_dotenv()

from fastmcp import FastMCP
from starlette.requests import Request
from starlette.responses import JSONResponse

from cashfree import lookup_vehicle_rc, normalize_cashfree_response, normalize_reg
from claude_tools import analyze_audio, analyze_photos, generate_report

mcp = FastMCP(
    "used-car-inspector",
    instructions=(
        "MCP server for the Secondhand Sathi used-car inspection app. "
        "Provides vehicle RC lookup via Cashfree, photo analysis, audio analysis, "
        "and final buying-decision report generation — all powered by Claude."
    ),
)


# ── MCP tools ────────────────────────────────────────────────────────────────


@mcp.tool()
async def lookup_vehicle(registration_number: str) -> dict:
    """Look up Indian vehicle registration details from the Cashfree RC API."""
    reg = normalize_reg(registration_number)
    if not reg:
        return {"error": "Registration number is required"}
    try:
        raw = await lookup_vehicle_rc(reg)
        normalized = normalize_cashfree_response(raw, reg)
        return {"provider": "cashfree", "mode": "live", "data": normalized}
    except Exception as exc:
        return {
            "provider": "mock",
            "mode": "mock",
            "data": _mock_vehicle(reg),
            "warning": str(exc),
        }


@mcp.tool()
async def analyze_inspection_photos(photos: list[dict]) -> dict:
    """
    Analyse used-car inspection photos with Claude Vision.

    Each photo dict must have: base64 (str), name (str), type (str), label (str).
    Returns a structured photo analysis result.
    """
    if not photos:
        return {"error": "No photos provided"}
    try:
        analysis = await analyze_photos(photos)
        return {"analysis": analysis}
    except Exception as exc:
        return {"error": str(exc)}


@mcp.tool()
async def analyze_engine_audio(audio_base64: str, filename: str, mimetype: str) -> dict:
    """
    Transcribe engine audio with OpenAI Whisper and analyse it with Claude.

    audio_base64: base64-encoded audio file content.
    Returns transcript + structured audio analysis.
    """
    if not audio_base64:
        return {"error": "No audio data provided"}
    try:
        result = await analyze_audio(audio_base64, filename, mimetype)
        return result
    except Exception as exc:
        return {"error": str(exc)}


@mcp.tool()
async def generate_inspection_report(
    details: dict,
    vehicle_api_data: dict,
    photo_analysis: dict,
    structural_checks: list[dict],
    audio_analysis: dict,
) -> dict:
    """
    Generate a final buying-decision report from all inspection signals.

    Returns a structured report with decision (buy/negotiate/avoid), score,
    findings, repair estimates, and negotiation strategy.
    """
    try:
        report = await generate_report(
            details, vehicle_api_data, photo_analysis, structural_checks, audio_analysis
        )
        return {"report": report}
    except Exception as exc:
        return {"error": str(exc)}


# ── REST compatibility routes ─────────────────────────────────────────────────


@mcp.custom_route("/health", methods=["GET"])
async def _health(request: Request) -> JSONResponse:
    has_anthropic = bool(os.environ.get("ANTHROPIC_API_KEY"))
    has_openai = bool(os.environ.get("OPENAI_API_KEY"))
    has_cashfree = bool(
        os.environ.get("VEHICLE_RC_CLIENT_ID") and os.environ.get("VEHICLE_RC_CLIENT_SECRET")
    )
    return JSONResponse(
        {
            "status": "ok",
            "service": "used-car-inspector-py",
            "providers": {
                "claude": has_anthropic,
                "whisper": has_openai,
                "cashfree": has_cashfree,
            },
        }
    )


@mcp.custom_route("/api/vehicle/lookup", methods=["POST"])
async def _vehicle_lookup(request: Request) -> JSONResponse:
    body = await request.json()
    registration_number = str(body.get("registrationNumber", "")).strip()
    if not registration_number:
        return JSONResponse({"error": "registrationNumber is required"}, status_code=400)
    reg = normalize_reg(registration_number)
    try:
        raw = await lookup_vehicle_rc(reg)
        normalized = normalize_cashfree_response(raw, reg)
        return JSONResponse({"provider": "cashfree", "mode": "live", "data": normalized})
    except Exception as exc:
        return JSONResponse(
            {"provider": "mock", "mode": "mock", "data": _mock_vehicle(reg), "warning": str(exc)}
        )


@mcp.custom_route("/api/inspection/analyze-photos", methods=["POST"])
async def _analyze_photos(request: Request) -> JSONResponse:
    body = await request.json()
    photos: list[dict] = body.get("photos", [])
    if not photos:
        return JSONResponse({"error": "No photos provided"}, status_code=400)
    try:
        analysis = await analyze_photos(photos)
        return JSONResponse({"analysis": analysis})
    except Exception as exc:
        return JSONResponse({"error": str(exc)}, status_code=500)


@mcp.custom_route("/api/inspection/analyze-audio", methods=["POST"])
async def _analyze_audio(request: Request) -> JSONResponse:
    body = await request.json()
    audio_base64: str = body.get("audioBase64", "")
    filename: str = body.get("filename", "audio.m4a")
    mimetype: str = body.get("mimetype", "audio/m4a")
    if not audio_base64:
        return JSONResponse({"error": "audioBase64 is required"}, status_code=400)
    try:
        result = await analyze_audio(audio_base64, filename, mimetype)
        return JSONResponse(result)
    except Exception as exc:
        return JSONResponse({"error": str(exc)}, status_code=500)


@mcp.custom_route("/api/inspection/generate-report", methods=["POST"])
async def _generate_report(request: Request) -> JSONResponse:
    body = await request.json()
    try:
        report = await generate_report(
            details=body.get("details", {}),
            vehicle_api_data=body.get("vehicleApiData", {}),
            photo_analysis=body.get("photoAnalysis", {}),
            structural_checks=body.get("structuralChecks", []),
            audio_analysis=body.get("audioAnalysis", {}),
        )
        return JSONResponse({"report": report})
    except Exception as exc:
        return JSONResponse({"error": str(exc)}, status_code=500)


# ── Helpers ───────────────────────────────────────────────────────────────────


def _mock_vehicle(reg: str) -> dict:
    return {
        "registrationNumber": reg,
        "ownerName": "Demo Owner",
        "makerModel": "Maruti Suzuki Swift",
        "fuelType": "Petrol",
        "vehicleClass": "Motor Car",
        "chassisNumber": "MA3FJEB1S00123456",
        "engineNumber": "K12MN1234567",
        "registrationDate": "2019-03-15",
        "fitnessUpto": "2034-03-14",
        "insuranceExpiry": "2026-03-14",
        "colour": "White",
        "state": "Maharashtra",
        "yearOfManufacture": "2019",
        "blacklistStatus": "",
        "financeBank": "",
        "noc": "",
    }


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5050"))
    mcp.run(transport="streamable-http", host="0.0.0.0", port=port)
