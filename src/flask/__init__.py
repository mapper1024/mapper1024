# Simple Flask app to serve the mapper UI and a backend.
from flask import Flask, send_from_directory, render_template

app = Flask(__name__)

# Main UI page.
@app.route("/")
def index():
    return render_template("index.html")

# Server-provided interface (scripts & HTML) to wrap the mapper component.
@app.route("/interface/<path:path>")
def interface(path):
    return send_from_directory("interface", path)

# The actual mapper component as static files.
@app.route("/mapper/<path:path>")
def mapper(path):
	return send_from_directory("../../mapper", path)

# TODO: backend
