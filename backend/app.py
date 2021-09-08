from flask import Flask, request, render_template
from flask_restful import Resource, Api
import json


# TODO: create a dict with (room_id, creationTime) and delete room if creationTime+24h<time.now

# API, both sender and receiver contact for creating and joining rooms.
class Room(Resource):
    # Receiver gets offer, Sender gets answer
    def get(self, room_id):
        with open(f'./r/{room_id}.json', 'r') as f:
            return f.read()

    # Sender puts offer, Receiver puts answer
    def put(self, room_id):
        with open(f'./r/{room_id}.json', 'w') as f:
            f.write(json.dumps(request.json))
        return request.json


app = Flask(__name__)
api = Api(app)
api.add_resource(Room, '/api/<room_id>')


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


if __name__ == '__main__':
    app.run(debug=True)
