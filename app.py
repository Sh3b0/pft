from flask import Flask, render_template

app = Flask(__name__)


@app.route('/')
def home():
    return render_template('sender.html')


@app.route('/receive/', defaults={'room_id': None})
@app.route('/receive/<room_id>/')
def receive(room_id):
    return render_template('receiver.html')


def run():
    app.run(debug=True)
