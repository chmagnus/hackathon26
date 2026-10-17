from fastapi import APIRouter
from fastapi.responses import JSONResponse

from ..content_data import SYSTEMS
from ..schemas import Moon, StarSystem, SystemSummary

router = APIRouter(prefix="/api/systems", tags=["Learning content"])


def not_found(code: str, message: str) -> JSONResponse:
    return JSONResponse(status_code=404, content={"error": {"code": code, "message": message}})


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
