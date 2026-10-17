from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from .routes.systems import router as systems_router

app = FastAPI(title="Nova API")
app.include_router(systems_router)

class Item(BaseModel):
    name: str
    price: float
    in_stock: bool = True


items: dict[int, Item] = {}


@app.get("/")
def root():
    return {"message": "Hello, world"}


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/hello")
def hello(name: str = "world"):
    return {"message": f"Hello, {name} from Nova"}
