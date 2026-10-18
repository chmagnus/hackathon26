from fastapi import APIRouter
from fastapi.responses import JSONResponse

from ..chain import verify
from ..content_data import SYSTEMS
from ..schemas import Moon, StarSystem, SystemSummary, VerifyRequest, VerifyResult

router = APIRouter(prefix="/api/systems", tags=["Learning content"])


def api_error(status: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(status_code=status, content={"error": {"code": code, "message": message}})


def not_found(code: str, message: str) -> JSONResponse:
    return api_error(404, code, message)


@router.get("", response_model=list[SystemSummary], summary="List available algorithm planets")
def list_systems():
    return [SystemSummary(
        id=system.id, title=system.title, colour=system.colour,
        moon_count=sum(len(orbit.moons) for orbit in system.orbits),
    ) for system in SYSTEMS.values()]


@router.get("/{system_id}", response_model=StarSystem, summary="Get a planet and all its moon lessons", responses={404: {"description": "Planet not found"}})
def get_system(system_id: str):
    system = SYSTEMS.get(system_id)
    if system is None:
        return not_found("system_not_found", f"No planet called '{system_id}'.")
    return system


@router.get("/{system_id}/moons/{moon_id}", response_model=Moon, summary="Get one moon lesson", responses={404: {"description": "Planet or moon not found"}})
def get_moon(system_id: str, moon_id: str):
    system = SYSTEMS.get(system_id)
    if system is None:
        return not_found("system_not_found", f"No planet called '{system_id}'.")
    for orbit in system.orbits:
        for moon in orbit.moons:
            if moon.id == moon_id:
                return moon
    return not_found("moon_not_found", f"No moon called '{moon_id}' on '{system_id}'.")


@router.post("/{system_id}/verify", response_model=VerifyResult, summary="Check lesson edits against a planet's hash chain", responses={404: {"description": "Planet or moon not found"}, 409: {"description": "Planet has no hash chain"}})
def verify_system(system_id: str, request: VerifyRequest):
    system = SYSTEMS.get(system_id)
    if system is None:
        return not_found("system_not_found", f"No planet called '{system_id}'.")
    if not system.chain:
        return api_error(409, "chain_disabled", f"'{system_id}' does not have a hash chain.")
    moon_ids = {moon.id for orbit in system.orbits for moon in orbit.moons}
    unknown = sorted(set(request.edits) - moon_ids)
    if unknown:
        return not_found("moon_not_found", f"No moon called '{unknown[0]}' on '{system_id}'.")
    return verify(system, request.edits)
