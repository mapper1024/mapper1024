from flask import Flask, send_from_directory, render_template

app = Flask(__name__)

@app.route("/")
def index():
    return send_from_directory("../demo", "index.html");

@app.route("/mapper/samples/<path:path>")
def sample_files(path):
    return send_from_directory("../../samples", path);

@app.route("/mapper/<path:path>")
def mapper_files(path):
    return send_from_directory("../../mapper", path);

@app.route("/<path:path>")
def files(path):
    return send_from_directory("../demo", path);
