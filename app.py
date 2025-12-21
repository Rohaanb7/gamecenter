from flask import Flask, render_template,url_for

# Explicitly tell Flask the folder is named 'template'
app = Flask(__name__, template_folder='template')

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/booking")
def booking():
    return render_template("index1.html")

if __name__ == "__main__":
    app.run(debug=True)