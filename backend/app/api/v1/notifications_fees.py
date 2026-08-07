from fastapi import APIRouter, Depends, HTTPException
from app.schemas.misc import NotificationCreate, FeeCreate, FeeUpdate
from app.core.dependencies import get_current_user, get_current_admin
from app.core.database import get_collection
from bson import ObjectId
from datetime import datetime, timezone
from typing import Optional

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.post("", status_code=201)
async def create_notification(data: NotificationCreate, current_user: dict = Depends(get_current_admin)):
    col = get_collection("notifications")
    now = datetime.now(timezone.utc)
    doc = {
        **data.model_dump(),
        "created_by": str(current_user["_id"]),
        "is_read": False,
        "created_at": now,
    }
    result = await col.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return doc


@router.get("")
async def list_notifications(current_user: dict = Depends(get_current_user)):
    col = get_collection("notifications")
    role = current_user.get("role", "student")

    query = {
        "$or": [
            {"target_role": "all"},
            {"target_role": role},
            {"target_role": str(current_user["_id"])},
        ]
    }

    notifications = []
    async for n in col.find(query).sort("created_at", -1).limit(50):
        n["id"] = str(n.pop("_id"))
        notifications.append(n)

    return notifications


@router.put("/{notification_id}/read")
async def mark_as_read(notification_id: str, _=Depends(get_current_user)):
    col = get_collection("notifications")
    await col.update_one({"_id": ObjectId(notification_id)}, {"$set": {"is_read": True}})
    return {"message": "Marked as read"}


@router.delete("/{notification_id}")
async def delete_notification(notification_id: str, _=Depends(get_current_admin)):
    col = get_collection("notifications")
    await col.delete_one({"_id": ObjectId(notification_id)})
    return {"message": "Deleted"}


# ────────────────────── FEES ──────────────────────

fees_router = APIRouter(prefix="/fees", tags=["Fee Management"])


@fees_router.post("", status_code=201)
async def create_fee(data: FeeCreate, _=Depends(get_current_admin)):
    col = get_collection("fees")
    now = datetime.now(timezone.utc)
    doc = {
        **data.model_dump(),
        "amount_paid": 0,
        "balance": data.amount,
        "payment_status": "pending",
        "payment_date": None,
        "transaction_id": None,
        "created_at": now,
    }
    result = await col.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return doc


@fees_router.get("/student/{student_id}")
async def get_student_fees(student_id: str, _=Depends(get_current_user)):
    col = get_collection("fees")
    fees = []
    async for fee in col.find({"student_id": student_id}):
        fee["id"] = str(fee.pop("_id"))
        fees.append(fee)
    return fees


@fees_router.put("/{fee_id}")
async def update_fee(fee_id: str, data: FeeUpdate, _=Depends(get_current_admin)):
    col = get_collection("fees")
    fee = await col.find_one({"_id": ObjectId(fee_id)})
    if not fee:
        raise HTTPException(status_code=404, detail="Fee record not found")

    updates = data.model_dump(exclude_none=True)
    if "amount_paid" in updates:
        updates["balance"] = fee["amount"] - updates["amount_paid"]
        if updates["balance"] <= 0:
            updates["payment_status"] = "paid"
        else:
            updates["payment_status"] = "partial"

    await col.update_one({"_id": ObjectId(fee_id)}, {"$set": updates})
    fee = await col.find_one({"_id": ObjectId(fee_id)})
    fee["id"] = str(fee.pop("_id"))
    return fee


@fees_router.get("/summary")
async def get_fees_summary(_=Depends(get_current_admin)):
    col = get_collection("fees")
    pipeline = [
        {"$group": {
            "_id": "$payment_status",
            "count": {"$sum": 1},
            "total_amount": {"$sum": "$amount"},
            "total_paid": {"$sum": "$amount_paid"},
        }}
    ]
    summary = {}
    async for item in col.aggregate(pipeline):
        summary[item["_id"]] = {
            "count": item["count"],
            "total_amount": item["total_amount"],
            "total_paid": item["total_paid"],
        }
    return summary
