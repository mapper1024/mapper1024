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
# This could be replaced with loading the mapper component from the bundled release file from another server.
# However, serving it directly makes development easier: no rebundling needed to test changes.
@app.route("/mapper/<path:path>")
def mapper(path):
	return send_from_directory("../../mapper", path)

@app.route("/samples/<path:path>")
def samples(path):
	return send_from_directory("../../samples", path)

# TODO: backend
