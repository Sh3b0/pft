from flask import Flask, request, render_template
from flask_restful import Resource, Api
import json
from datetime import datetime
import os
# TODO: create a dict with (room_id, creationTime) and delete room if creationTime+24h<time.now
# API, both sender and receiver contact for creating and joining rooms.

room_deletion = {}
rooms = []
class Room(Resource):
    # Receiver gets offer, Sender gets answer

    def get(self, room_id):


        with open(f'./r/{room_id}.json', 'r') as f:
            return f.read()

    # Sender puts offer, Receiver puts answer
    def put(self, room_id):

        with open(f'./r/{room_id}.json', 'w') as f:
            f.write(json.dumps(request.json))
        global rooms
        global room_deletion
        then = datetime.now()
        now = datetime.now()
        if room_id not in rooms:
            rooms.append(room_id)

        if room_id not in room_deletion:
            room_deletion.update({f"{room_id}": then})
        print(room_deletion, "\n", then)
        print("I am here")
        print(rooms)

        i = 0
        while i < len(rooms):
            print("i, len:", i, len(rooms), len(room_deletion))
            print(room_deletion)
            duration = now - room_deletion[rooms[i]]
            duration_in_s = duration.total_seconds()
            hours = duration_in_s / 3600
            print("R: ", rooms[i], "T:", duration_in_s)
            if duration_in_s >= 24*3600:
                print("deleted", rooms[i])
                os.remove(f'./r/{rooms[i]}.json')
                room_deletion.pop(rooms[i])
                rooms.remove(rooms[i])
                i -= 1

            i = i + 1

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


