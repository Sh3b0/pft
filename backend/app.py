from flask import Flask, render_template

app = Flask(__name__)


@app.route('/')
def home():
    return render_template('index.html')


@app.route('/sender/')
def sender():
    return render_template('sender.html')


@app.route('/receiver/', defaults={'room_id': None})
@app.route('/receiver/<room_id>/')
def receiver(room_id):
    return render_template('receiver.html')


def run():
    app.run(debug=False)
