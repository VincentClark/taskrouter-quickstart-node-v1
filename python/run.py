# -*- coding: latin-1 -*-

from flask import Flask, request, Response, render_template
from twilio.rest import Client
from twilio.jwt.taskrouter.capabilities import WorkerCapabilityToken
from twilio.twiml.voice_response import VoiceResponse

# Normally these SIDS will be in environmental variables

# Start Sids
account_sid = ""
auth_token = ""
workspace_sid = ""
workflow_sid = ""
# end sids

app = Flask(__name__)

client = Client(username=account_sid, password=auth_token)


@app.route('/assignment_callback', methods=['POST', 'GET'])
def assignment_callback():
    """Respond to assignment callbacks with an acceptance and 200 response
    Removed all identifiable information
    """

    ret = '{' \
          '"instruction": "dequeue", ' \
          '"to":"+",' \
          '"from":"+", ' \
          '"post_work_activity_sid":"WA6d23017dc5c8ea8a1db41863e0305f8f"}'  # a verified phone number from your twilio account
    resp = Response(response=ret, status=200, mimetype='application/json')
    return resp


@app.route("/create_task", methods=['GET', 'POST'])
def create_task():
    """Creating Task"""
    task = client.taskrouter.workspaces(sid=workspace_sid).tasks.create(
        workflow_sid=workflow_sid,
        attributes='{"selected_language":"es"}'
    )
    print(task.attributes)
    resp = Response({}, status=200, mimetype='application/json')
    return resp


@app.route("/accept_reservation", methods=['GET', 'POST'])
def accept_reservation():
    """Accepting a Reservation"""
    task_sid = request.args.get('task_sid')
    # WT46058307391cc91b08b0a95c768cc49f
    #
    reservation_sid = request.args.get('reservation_sid')

    reservation = client.taskrouter.workspaces(workspace_sid) \
        .tasks(task_sid) \
        .reservations(reservation_sid) \
        .update(reservation_status='accepted')
    print(reservation.reservation_status)
    print(reservation.worker_name)

    resp = Response({}, status=200, mimetype='application/json')
    return resp


@app.route("/incoming_call", methods=['GET', 'POST'])
def incoming_call():
    """Respond to incoming requests."""
    print("Incomming")
    resp = VoiceResponse()
    with resp.gather(numDigits=1, action="/enqueue_call", method="POST", timeout=50) as g:
        g.say("Para Espan?ol oprime el uno.", language='es')
        g.say("For English, please hold or press two.", language='en')
    return str(resp)


@app.route("/enqueue_call", methods=['GET', 'POST'])
def enqueue_call():
    digit_pressed = request.args.get('Digits')
    print(request.args)
    print("digit pressed" + str(digit_pressed))
    if digit_pressed == 1:
        language = "es"
    else:
        language = "es"

    resp = VoiceResponse()
    enqueue = resp.enqueue(None, workflow_sid=workflow_sid)
    enqueue.task('{"selected_language":"' + language + '"}')
    resp.append(enqueue)
    print("digit pressed " + str(digit_pressed))
    print(resp)
    return str(resp)


@app.route("/agents", methods=['GET'])
def generate_view():
    worker_sid = request.args.get('WorkerSid')
    worker_capability = WorkerCapabilityToken(
        account_sid, auth_token, workspace_sid, worker_sid)
    worker_capability.allow_update_activities()
    worker_capability.allow_update_reservations()

    worker_token = worker_capability.to_jwt()
    print(worker_token)
    return render_template('agents.html', worker_token=worker_token)


if __name__ == "__main__":
    app.run(host='localhost', port=8000, debug=True)
