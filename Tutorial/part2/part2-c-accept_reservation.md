# Creating Tasks and Accepting Reservations: Accept a Reservation using the REST API

To indicate that a Worker has accepted or rejected a Task, you make an HTTP POST request to a Reservation instance resource. To do that, we need the TaskSid, which is available via the web portal, and the ReservationSid. The ReservationSid was passed to our Assignment Callback URL when a Worker was reserved for our Task. Using the ngrok inspector page at <code style="color:red;background-color:ivory">http://localhost4040</code>, we can easily find the request parameters sent from TaskRouter and copy the ReservationSid to our clipboard. \*\*

> The Reservation API resource is ephemeral and exists only within the context of a Task. As such, it doesn't have its own primary API resource and you'll find it documented in the Tasks resource section of the reference documentation.

With our trusty TaskSid and ReservationSid in hand, let's make another REST API request to accept our Task Reservation. We'll add on to our run.py to accept a reservation with our web server. Remember to substitute your own account details in place of the curly braces.

### server.js

```javascript
//imports
require("dotenv").config();
const express = require("express");
const { urlencoded } = require("body-parser");
const twilio = require("twilio");
const VoiceResponse = require("twilio/lib/twiml/VoiceResponse");

//account information
const account_sid = process.env.TWILIO_ACCOUNT_SID;
const auth_token = process.env.TWILIO_AUTH_TOKEN;
const workspace_sid = process.env.TWILIO_WORKSPACE_SID;
const workflow_sid = process.env.TWILIO_WORKFLOW_SID;
const worker_alice_sid = process.env.TWILIO_WORKER_ALICE_SID;
const worker_bob_sid = process.env.TWILIO_WORKER_BOB_SID;
const post_worker_activity_sid = process.env.TWILIO_POST_WORKER_ACTIVITY;

//twilio setup
const client = twilio(account_sid, auth_token);
const voice_client = twilio.twiml.VoiceResponse();
//express setup
const port = 3000;
const app = express();
app.use(urlencoded({ extended: false }));

//routes
app.post("/assignment_callback", (req, res) => {
  try {
    console.log("assignment_callback");
    res.status(200).json({ message: "success" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "error", error: err });
  }
});

app.get("/create_task", (req, res) => {
  //Create a task
  try {
    client.taskrouter
      .workspaces(workspace_sid)
      .tasks.create({
        workflowSid: workflow_sid,
        attributes: JSON.stringify({
          selected_language: "es",
        }),
      })
      .then((task) => {
        console.log(task.sid);
        res.send(`task ${task.sid}`);
      });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "error", error: err });
  }
});

app.get("/accept_reservation", (req, res) => {
  //accept reservation
  //ensure your url matches http://localhost:3000/accept_reservation?task_sid={task_sid}
  let task_sid = req.query.task_sid;
  let reservation_sid = req.query.reservation_sid;
  console.log("task", task_sid);
  console.log("reservation", reservation_sid);
  try {
    let reservation = client.taskrouter
      .workspaces(workspace_sid)
      .tasks(task_sid)
      .reservations(reservation_sid)
      .update({ reservationStatus: "accepted" })
      .then((reservation) => {
        console.log("reservation!", reservation.reservationStatus);
        res.status(200).json({
          reservation_status: reservation.reservationStatus,
          reservation_worker: reservation.workerName,
        });
      });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "error", error: err });
  }
});
```

If you'd like to use curl instead, put the following into your terminal:

```bash
curl -X POST https://taskrouter.twilio.com/v1/Workspaces/{WorkspaceSid}/Tasks/{TaskSid}/Reservations/{ReservationSid}
-d ReservationStatus=accepted
-u {AccountSid}:{AuthToken}
```

Examining the response from TaskRouter, we see that the Task Reservation has been accepted, and the Task has been assigned to the our Worker Alice:

```json
{... "worker_name": "Alice", "reservation_status": "accepted", ...}
```

_If you don't see this, it's possible that your Reservation has timed out. If this is the case, set your Worker back to an available Activity state and create another Task. To prevent this occuring, you can increase the 'Task Reservation Timeout' value in your Workflow configuration._

~~With your Workspace open in the TaskRouter web portal, click 'Workers' and you'll see that Alice has been transitioned to the 'Assignment Activity' of the TaskQueue that assigned the Task. In this case, "Busy":~~

[Next: Accept a Reservation using Assignment Instructions »](part-2-d-accept_assignment_instructions.md)

_/_/ If you're not using ngrok or a similar tool, you can modify server.js to console.log the value of ReservationSid. Or, you can use the Tasks REST API instance resource to look up the ReservationSid based on the TaskSid.
