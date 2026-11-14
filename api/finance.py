import json
from datetime import date
from decimal import Decimal, InvalidOperation

from api.finance_db import (
    add_transaction,
    get_recent_transactions,
    get_categories
)


def amount_to_pence(value):
    """Convert a pound amount into integer pence."""
    try:
        amount = Decimal(str(value))
        if not amount.is_finite() or amount <= 0:
            raise ValueError("Amount must be greater than zero")

        pence = amount * 100

        if pence != pence.to_integral_value():
            raise ValueError("Amount cannot have fractions of a penny")

        return int(pence)

    except (InvalidOperation, TypeError):
        raise ValueError("Invalid amount")


def handle_finance_get(handler):
    """Handle GET requests for finance data."""
    path = handler.path.split("?")[0]

    if path == "/api/finance/categories":
        data = get_categories()

    elif path == "/api/finance/recent":
        data = get_recent_transactions(5)

    else:
        handler.send_error(404, "Finance endpoint not found")
        return

    response = json.dumps(data).encode("utf-8")

    handler.send_response(200)
    handler.send_header("Content-Type", "application/json")
    handler.send_header("Content-Length", str(len(response)))
    handler.end_headers()
    handler.wfile.write(response)


def handle_finance_post(handler):
    """Handle POST requests for finance data."""
    path = handler.path.split("?")[0]

    if path != "/api/finance/transactions":
        handler.send_error(404, "Finance endpoint not found")
        return

    try:
        length = int(handler.headers.get("Content-Length", 0))
        if length <= 0 or length > 10000:
            raise ValueError("Invalid request size")

        body = handler.rfile.read(length)
        data = json.loads(body)

        transaction_date = data.get("date")
        amount_pence = amount_to_pence(data.get("amount"))
        category = data.get("category")

        # Validate the date
        date.fromisoformat(transaction_date)

        # Validate the category
        if category not in get_categories():
            raise ValueError("Unknown category")

        transaction_id = add_transaction(
            transaction_date,
            amount_pence,
            category
        )

        result = {
            "success": True,
            "id": transaction_id,
            "message": "Transaction saved"
        }

        status = 201

    except (ValueError, TypeError, json.JSONDecodeError) as error:
        result = {
            "success": False,
            "error": str(error)
        }
        status = 400

    response = json.dumps(result).encode("utf-8")

    handler.send_response(status)
    handler.send_header("Content-Type", "application/json")
    handler.send_header("Content-Length", str(len(response)))
    handler.end_headers()
    handler.wfile.write(response)