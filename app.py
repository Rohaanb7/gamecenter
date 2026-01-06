from flask import Flask, render_template, request, jsonify
from pymongo import MongoClient
from flask_cors import CORS

app = Flask(__name__, template_folder='template')
CORS(app)

MONGO_URI = "mongodb+srv://rohaan:1234@cluster0.cjebhdq.mongodb.net/matrixdb?retryWrites=true&w=majority"
client = MongoClient(MONGO_URI)
db = client["matrixdb"]
collection = db["matrix"]

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/booking")
def booking():
    return render_template("index2.html")

TIME_SLOTS = [
    "10 - 11 AM", "11 - 12 PM", "12 - 1 PM", "1 - 2 PM",
    "2 - 3 PM", "3 - 4 PM", "4 - 5 PM", "5 - 6 PM",
    "6 - 7 PM", "7 - 8 PM", "8 - 9 PM", "9 - 10 PM"
]

@app.route("/time-slots")
def get_time_slots():
    return jsonify(TIME_SLOTS)

@app.route("/add-booking", methods=["POST"])
def add_booking():

    data = request.get_json() if request.is_json else request.form

    required_fields = ["name", "contact", "players", "console", "date", "time_slot"]
    missing = [f for f in required_fields if not data.get(f)]
    if missing:
        return jsonify({"message": f"Missing fields: {', '.join(missing)}"}), 400

    # 🔴 CHECK IF SLOT ALREADY BOOKED
    existing_booking = collection.find_one({
        "date": data.get("date"),
        "time_slot": data.get("time_slot"),
        "console": data.get("console")
    })

    if existing_booking:
        return jsonify({
            "message": "This time slot is already booked ❌"
        }), 409

    booking_data = {
        "name": data.get("name"),
        "contact": data.get("contact"),
        "players": int(data.get("players")),
        "console": data.get("console"),
        "date": data.get("date"),
        "time_slot": data.get("time_slot")
    }

    collection.insert_one(booking_data)

    return jsonify({"message": "Booking successful 🎮"}), 200

if __name__ == "__main__":
    app.run(port=5000, debug=True)
