from flask import Flask, send_from_directory, render_template

app = Flask(__name__)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/interface/<path:path>")
def interface(path):
    return send_from_directory("interface", path)

@app.route("/mapper/<path:path>")
def mapper(path):
	return send_from_directory("../../mapper", path)
