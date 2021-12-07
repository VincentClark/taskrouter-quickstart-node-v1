# Creating Tasks and Accepting Reservations: Accept a Reservation using Assignment Callback Instructions

Remember when we created a Task and accepted it using the Reservations subresource of the REST API? I do. And it was grand.

This time, we'll create another Task, again using the REST API, but we will have our server accept the Reservation as soon as it is notified, via a synchronous HTTP response.

Before we create the next Task, once again make sure that our Worker Alice is in a non-available Activity state.

Call the Create Task endpoint exposed with run.py again, or execute the following curl command:

```bash
curl https://taskrouter.twilio.com/v1/Workspaces/{WorkspaceSid}/Tasks \
--data-urlencode Attributes='{"selected_language": "es"}' \
-d WorkflowSid={WorkflowSid} \
-u {AccountSid}:{AuthToken}
```

This time, before bringing Alice online, we need to make changes to our assignment_callback method in our server.js. Open it and modify the existing code to reflect the following:

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
    res.status(200).json({
      instuction: "accept",
      activity_sid: post_worker_activity_sid,
    });
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

//initalize server
app.listen(port, () =>
  console.log(`Taskrouter app listening on port ${port}!`)
);
```

Instead of returning an empty JSON document as before, we've included an 'assignment instruction' in our response. The 'accept' assignment instruction tells TaskRouter to automatically accept the Reservation and assign the Task to the Worker it has been reserved for.

To kick this process off, we need to transition Alice to an available Activity. With your Workspace open in the TaskRouter web portal, click 'Workers' then click to edit Alice and set her Activity to 'Idle'.

Now, click 'Tasks' in the main navigation and you should see that the Task has an Assignment Status of 'assigned':

**IMAGE TASKS**
What actually happened is that Alice was reserved for a very short period of time. TaskRouter made a request to your web server at the Assignment Callback URL, and your server told TaskRouter to accept the Reservation. At that point, Alice's Activity transitioned to the 'Assignment Activity' of the TaskQueue that assigned the Task, as it did in the previous step.

_removed section that shows alice busy_

And that's that. We created another Task using the REST API, accepted it via an assignment instruction at our Workflow's Assignment Callback URL and saw that this immediately accepted the Reservation for our Worker.

Onward! Next, we'll learn about shortcuts to create Tasks originating from Twilio phone calls.

[Part 3: Create Tasks from Phone Calls using TwiML »](../part3/part3.md)

<details>
<summary>Click to expand navigation</summary>

- [Part 2](part2.md)
- [Overview](../overview.md)

</details>
