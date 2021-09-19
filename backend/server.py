from flask_restful import Resource, Api
from flask import request
from apscheduler.schedulers.background import BackgroundScheduler
import atexit
import time
import json
import os
import app


class API(Resource):
    def get(self, room_id):
        """
        Receiver gets offer, Sender gets answer.
        """
        with open(f'./r/{room_id}.json', 'r') as f:
            return f.read()

    def put(self, room_id):
        """
        Sender puts offer, Receiver puts answer.
        """
        with open(f'./r/{room_id}.json', 'w') as f:
            f.write(json.dumps(request.json))


def delete_job(room_lifetime):
    """
    A background job (runs every hour) that deletes expired rooms
    :param room_lifetime: room expiry (in seconds)
    """
    for room in os.listdir('r'):
        if time.time() - os.path.getmtime(f'r{os.path.sep}{room}') > room_lifetime:
            os.remove(f'r{os.path.sep}{room}')


def init_rooms():
    """
    Creates a directory for rooms if it does not exist.
    """
    if not os.path.exists('r'):
        os.mkdir('r')


def init_scheduler():
    """
    Creates and runs a scheduler that executes background jobs.
    """
    scheduler = BackgroundScheduler()
    scheduler.add_job(func=delete_job, args=(60 * 60,), trigger="interval", hours=1)
    scheduler.start()
    atexit.register(lambda: scheduler.shutdown())


def init_api():
    """
    Creates the API and add a route for it.
    """
    api = Api(app.app)
    api.add_resource(API, '/api/<room_id>')


if __name__ == '__main__':
    init_rooms()
    init_scheduler()
    init_api()
    app.run()
