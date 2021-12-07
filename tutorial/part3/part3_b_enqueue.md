# Create Tasks from Phone Calls using TwiML: Create a TaskRouter Task using <_Enqueue_>

In the previous step we received a call to a Twilio phone number and prompted the caller to select a preferred language. But when the caller selected their language, we weren't ready to handle that input. Let's fix that. Create a new endpoint called 'enqueue_call' and add the following code.

### server.js

```javascript
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
      instruction: "accept",
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
//incomming call
app.post("/incoming_call", (req, res) => {
  try {
    const twiml = new VoiceResponse();
    twiml.say("Welcome to the Call");
    //
    const g = twiml.gather({
      method: "POST",
      numDigits: 1,
      action: "/enqueue_call",
      timeout: 50,
    });
    g.say("For English press 1", { language: "en" });
    g.say("Para español presione 2", { language: "es" });
    //send to Twilio as twiml
    res.status(200).send(twiml.toString());
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "error" });
  }
});
app.post("/enqueue_call", (req, res) => {
  const digit_pressed = req.body.Digits;
  try {
    const language = (digits) => (digits === "1" ? "en" : "es");
    const twiml = new VoiceResponse();
    const enqueue = twiml.enqueue({
      workflowSid: workflow_sid,
    });
    enqueue.task(`{"selected_language":"${language(digit_pressed)}"}`);
    res.setHeader("Content-Type", "text/xml");
    res.status(200).send(enqueue.toString());
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
  }
});
//initalize server
app.listen(port, () =>
  console.log(`Taskrouter app listening on port ${port}!`)
);
```

Now call your Twilio phone number. When prompted, press one for Spanish. You should hear Twilio's default <_Queue_> hold music. Congratulations! You just added yourself to the 'Customer Care Requests - Spanish' Task Queue based on your selected language. To clarify how exactly this happened, look more closely at what is returned from enqueue_call to Twilio when our caller presses one:

## enqueue_call - TwiML Output

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Enqueue workflowSid="WW0123401234...">
    <Task>{"selected_language": "es"}</Task>
  </Enqueue>
</Response>
```

Just like when we created a Task using the TaskRouter REST API (via curl), a Task has been created with an attribute field "selected_language" of value "es". This instructs the Workflow to add the Task to the 'Customer Care Requests - Spanish' TaskQueue based on the Routing Configurations we defined when we set up our Workflow. TaskRouter then starts monitoring for an available Worker to handle the Task.

Looking in the TaskRouter web portal, you will see the newly created Task in the Tasks section, and if you make an eligible Worker available, you should see them assigned to handle the Task. However, we don't yet have a way to bridge the caller to the Worker when the Worker becomes available.

In the next section, we'll use a special Assignment Instruction to easily dequeue the call and route it to an eligible Worker - our good friend Alice. For now, you can hang up the call on hold.

> NOTE: **Para español presione 2** sounds akward. This can easily be corrected by adding some twiml magic giving Alice an American accent when speaking English, and a Mexican-Spanish accent when speaking Spanish.

```javascript
twiml.say(
  {
    voice: "alice",
  },
  "Welcome to the Call"
);
//
const g = twiml.gather({
  method: "POST",
  numDigits: 1,
  action: "/enqueue_call",
  timeout: 50,
});
g.say(
  {
    voice: "alice",
    language: "en-US",
  },
  "For English press 1",
  { language: "en" }
);
g.say(
  {
    voice: "alice",
    language: "es-MX",
  },
  "Para español presione 2",
  { language: "es" }
);
```

[Next: Dequeue a Call to a Worker »](part3_c_dequeue_call.md)

<details>
<summary>Click to expand navigation</summary>

- [Part 2](part2.md)
- [Overview](../overview.md)

</details>
