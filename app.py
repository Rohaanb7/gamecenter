from flask import Flask, render_template, request, jsonify, session, redirect, url_for, send_file
from pymongo import MongoClient
from flask_cors import CORS
from functools import wraps
import os
import csv
from io import BytesIO
from datetime import datetime

app = Flask(__name__, template_folder='template')
CORS(app)

app.secret_key = "matrix_zone_admin_secret_2024"

# ===============================
# MONGODB CONNECTION
# ===============================
MONGO_URI = "mongodb+srv://rohaan:1234@cluster0.cjebhdq.mongodb.net/matrixdb?retryWrites=true&w=majority"
client = MongoClient(MONGO_URI)
db = client["matrixdb"]
collection = db["matrix"]

# ===============================
# CSV EXPORT FUNCTION
# ===============================
def export_mongodb_to_csv():
    try:
        bookings = list(collection.find({}, {"_id": 0}))

        # Save CSV in same folder as app.py
        file_path = os.path.join(os.path.dirname(__file__), "bookings_data.csv")

        print("Saving CSV at:", file_path)

        with open(file_path, "w", newline="", encoding="utf-8") as file:
            writer = csv.writer(file)
            writer.writerow(["Name", "Contact", "Players", "Console", "Date", "Time Slot"])

            for booking in bookings:
                writer.writerow([
                    booking.get("name", ""),
                    booking.get("contact", ""),
                    booking.get("players", ""),
                    booking.get("console", ""),
                    booking.get("date", ""),
                    booking.get("time_slot", "")
                ])

        print("✅ CSV CREATED / UPDATED SUCCESSFULLY")
        return True

    except Exception as e:
        print("❌ CSV ERROR:", e)
        return False


# Export once when server starts
export_mongodb_to_csv()

# ===============================
# ROUTES
# ===============================

@app.route("/")
def home():
    return render_template("index.html")


@app.route("/booking")
def booking():
    return render_template("index2.html")


@app.route("/admin")
def admin():
    return render_template("admin.html")


# ===============================
# ADMIN LOGIN
# ===============================

ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "matrix2024"

@app.route("/admin-login", methods=["POST"])
def admin_login():
    data = request.get_json() if request.is_json else request.form

    if data.get("username") == ADMIN_USERNAME and data.get("password") == ADMIN_PASSWORD:
        session['admin_logged_in'] = True
        return jsonify({"success": True})

    return jsonify({"success": False}), 401


@app.route("/admin-logout")
def admin_logout():
    session.pop('admin_logged_in', None)
    return redirect(url_for("home"))


def login_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if not session.get("admin_logged_in"):
            return jsonify({"message": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return wrapper


# ===============================
# TIME SLOTS
# ===============================

TIME_SLOTS = [
    "10 - 11 AM", "11 - 12 PM", "12 - 1 PM", "1 - 2 PM",
    "2 - 3 PM", "3 - 4 PM", "4 - 5 PM", "5 - 6 PM",
    "6 - 7 PM", "7 - 8 PM", "8 - 9 PM", "9 - 10 PM"
]

@app.route("/time-slots")
def get_time_slots():
    return jsonify(TIME_SLOTS)


@app.route("/booked-slots")
def booked_slots():
    date = request.args.get("date")
    console = request.args.get("console")

    bookings = collection.find(
        {"date": date, "console": console},
        {"_id": 0, "time_slot": 1}
    )

    return jsonify([b["time_slot"] for b in bookings])


# ===============================
# ADD BOOKING
# ===============================

@app.route("/add-booking", methods=["POST"])
def add_booking():
    data = request.get_json() if request.is_json else request.form

    required = ["name", "contact", "players", "console", "date", "time_slot"]
    if any(not data.get(field) for field in required):
        return jsonify({"message": "Missing required fields"}), 400

    # Check if slot already booked
    existing = collection.find_one({
        "date": data["date"],
        "time_slot": data["time_slot"],
        "console": data["console"]
    })

    if existing:
        return jsonify({"message": "Time slot already booked"}), 409

    booking_data = {
        "name": data["name"],
        "contact": data["contact"],
        "players": int(data["players"]),
        "console": data["console"],
        "date": data["date"],
        "time_slot": data["time_slot"]
    }

    collection.insert_one(booking_data)

    # Update CSV after insert
    export_mongodb_to_csv()

    return jsonify({"message": "Booking successful"}), 200


# ===============================
# ADMIN BOOKING MANAGEMENT
# ===============================

@app.route("/admin/bookings")
@login_required
def get_all_bookings():
    bookings = list(collection.find({}, {"_id": 0}))
    return jsonify(bookings)


@app.route("/admin/delete-booking", methods=["DELETE"])
@login_required
def delete_booking():
    data = request.get_json()

    result = collection.delete_one({
        "date": data.get("date"),
        "time_slot": data.get("time_slot"),
        "console": data.get("console")
    })

    if result.deleted_count > 0:
        export_mongodb_to_csv()
        return jsonify({"message": "Deleted successfully"})

    return jsonify({"message": "Booking not found"}), 404


@app.route("/admin/update-booking", methods=["PUT"])
@login_required
def update_booking():
    data = request.get_json()

    result = collection.update_one(
        {
            "date": data.get("old_date"),
            "time_slot": data.get("old_time_slot"),
            "console": data.get("old_console")
        },
        {
            "$set": {
                "name": data.get("name"),
                "contact": data.get("contact"),
                "players": int(data.get("players")),
                "console": data.get("console"),
                "date": data.get("date"),
                "time_slot": data.get("time_slot")
            }
        }
    )

    if result.modified_count > 0:
        export_mongodb_to_csv()
        return jsonify({"message": "Updated successfully"})

    return jsonify({"message": "Booking not found"}), 404


# ===============================
# DOWNLOAD CSV
# ===============================

@app.route("/admin/export-to-csv")
@login_required
def download_csv():
    file_path = os.path.join(os.path.dirname(__file__), "bookings_data.csv")

    if not os.path.exists(file_path):
        return jsonify({"message": "CSV file not found"}), 404

    return send_file(
        file_path,
        as_attachment=True,
        download_name=f"matrix_bookings_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
        mimetype="text/csv"
    )


# ===============================
# RUN APP
# ===============================

if __name__ == "__main__":
    app.run(port=5000, debug=True)