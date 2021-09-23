from flask import Flask, render_template

app = Flask(__name__)


@app.route('/')
def home():
    return render_template('sender.html')


@app.route('/r/', defaults={'room_id': None})
@app.route('/r/<room_id>/')
def receive(room_id):
    return render_template('receiver.html')


def run():
    app.run(debug=True)
