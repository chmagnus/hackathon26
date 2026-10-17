from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="My API")


class Item(BaseModel):
    name: str
    price: float
    in_stock: bool = True


items: dict[int, Item] = {}


@app.get("/")
def root():
    return {"message": "Hello, world"}


@app.get("/items/{item_id}")
def get_item(item_id: int):
    if item_id not in items:
        raise HTTPException(status_code=404, detail="Item not found")
    return items[item_id]


@app.post("/items/{item_id}")
def create_item(item_id: int, item: Item):
    items[item_id] = item
    return {"id": item_id, "item": item}
