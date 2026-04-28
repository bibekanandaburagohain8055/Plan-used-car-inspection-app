import os
import re

import httpx


def normalize_reg(reg: str) -> str:
    return re.sub(r"[^A-Z0-9]", "", reg.upper())


async def lookup_vehicle_rc(registration_number: str) -> dict:
    url = os.environ["VEHICLE_RC_URL"]
    client_id = os.environ["VEHICLE_RC_CLIENT_ID"]
    client_secret = os.environ["VEHICLE_RC_CLIENT_SECRET"]

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            url,
            headers={
                "x-client-id": client_id,
                "x-client-secret": client_secret,
                "x-api-version": "2023-08-01",
                "Content-Type": "application/json",
            },
            json={"vehicle_number": registration_number},
        )
        resp.raise_for_status()
        return resp.json()


def normalize_cashfree_response(data: dict, registration_number: str) -> dict:
    rc = data.get("data", data)

    maker = str(rc.get("maker_desc") or rc.get("maker") or "")
    model = str(rc.get("model") or rc.get("model_desc") or "")
    maker_model = f"{maker} {model}".strip() or None

    mfg_date = str(rc.get("mfg_date") or rc.get("manufacturing_date") or "")
    year = mfg_date[:4] if mfg_date else str(rc.get("year_of_manufacture") or "")

    return {
        "registrationNumber": str(rc.get("rc_number") or registration_number),
        "ownerName": str(rc.get("owner_name") or rc.get("registered_owner") or ""),
        "makerModel": maker_model,
        "fuelType": str(rc.get("fuel_type") or rc.get("fuel_desc") or ""),
        "vehicleClass": str(rc.get("vehicle_class") or rc.get("vch_class_desc") or ""),
        "chassisNumber": str(rc.get("chassis_number") or rc.get("chassis_no") or ""),
        "engineNumber": str(rc.get("engine_number") or rc.get("engine_no") or ""),
        "registrationDate": str(rc.get("reg_date") or rc.get("registration_date") or ""),
        "fitnessUpto": str(rc.get("fit_upto") or rc.get("fitness_upto") or ""),
        "insuranceExpiry": str(rc.get("insurance_expiry") or rc.get("insurance_upto") or ""),
        "colour": str(rc.get("color") or rc.get("colour") or ""),
        "state": str(rc.get("state") or rc.get("rto_state") or ""),
        "yearOfManufacture": year,
        "blacklistStatus": str(rc.get("blacklist_status") or ""),
        "financeBank": str(rc.get("financer") or rc.get("finance_bank") or ""),
        "noc": str(rc.get("noc_details") or ""),
        "raw": rc,
    }
