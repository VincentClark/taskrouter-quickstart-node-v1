# Creating Tasks and Accepting Reservations: Set up the Assignment Callback URL

---

The basic lifecycle of a [successful] TaskRouter Task is as follows:

Task Created → eligible Worker becomes available → Worker reserved → Reservation accepted → Task assigned to Worker.

In this part of the tutorial, we'll create Tasks and observe them through each of these stages. We start by creating a Task using the Tasks REST API. First time around we accept the Task using the Reservations REST API, then we create another Task and accept it [using assignment callback instructions](https://www.twilio.com/docs/taskrouter/handle-assignment-callbacks#responding-to-the-assignment-callback).

> Both the Reservations REST API and assignment callback instructions are valid methods for accepting a Reservation; it's likely that you'll choose one or the other based on the amount of background work that must be performed by your server before it accepts or rejects a Reservation. For example, due to the amount of time required, if you were to build a user interface that allowed human agents to inspect a Task before accepting it, you would need to accept the Reservation asynchronously using the Reservations REST API.

Whether we accept Reservations via the REST API or via assignment callback instructions, we always need an Assignment Callback URL that is reachable by TaskRouter. This is the URL at which TaskRouter will notify us when a Worker is reserved to perform a Task. Before creating any Tasks, let's get the Assignment Callback URL up and running.

Finally time to write some (albeit minimalist!) code.

First set up the local Node / Express server:

```
npm install express
```

**server.js**

```javascript
const express = require("express");

const port = 3000;
const app = express();

app.get("/assignment_callback", (req, res) => {
  console.log("assignment_callback");
  res.status(200).json({});
});
app.post("/assignment_callback", (req, res) => {
  console.log("assignment_callback");
  res.status(200).json({});
});

app.listen(port, () =>
  console.log(`Taskrouter app listening on port ${port}!`)
);
```

This returns an empty JSON document to TaskRouter with a 200 (OK) response code. This tells TaskRouter that the assignment callback was successfully received and parsed, but that we don't want to take any action on the Reservation right now. Instead, it's implied that we will use the REST API to accept or reject the Reservation when we are ready.

Now, start your Node Server from the terminal:

```
> node server.js

Taskrouter app listening on port 3000!
```

# Creating Tasks and Accepting Reservations: Create a Task using the REST API

Recall the TaskRouter Task lifecycle:

**Task Created** → eligible Worker becomes available → Worker reserved → Reservation accepted → Task assigned to Worker.

> If you'd like to to view the events happening in your Workspace at an Event Callback URL, please obtain a [free endpoint URL](https://requestbin.com/r) then set the Event Callback URL in your Workspace to point there.

**IMAGE**
Before we create our first Task, make sure that our Worker Alice is in a non-available Activity state. Bob's Activity state won't matter right now, as we will create a Spanish language Task that he is not eligible to handle.

With your Workspace open in the [TaskRouter web portal](https://www.twilio.com/user/account/taskrouter/workspaces), click 'Workers' then click to edit Alice and set her Activity to 'Offline'. Your Workers should look like this:

**IMAGE**
To simulate reality, we'll create a Task using the REST API rather than the web portal. We'll add on to our run.py to create a task with our web server. Replace the {} with your Twilio AccountSid, Twilio AuthToken, WorkspaceSid, and WorkflowSid.

???about the python helper library???

```
npm install Twilio
```

server.js

```javascript
app.get("/create_task", (req, res) => {
  //Create a task
  client.taskrouter
    .workspaces(workspace_sid)
    .tasks.create({
      workflowSid: workflow_sid,
      attributes: JSON.stringify({
        selected_language: "es",
      }),
    })
    .then((task) => {
      // console.log(task.sid);
      res.send(`task ${task.sid}`);
    });
});
```

Next, reset your Workflow's Assignment Callback URL as shown below to point to your new, running Node:Express routes.

**IMAGE SetAssignmentCallbackURL-v2.original **

To generate a Task, visit the /create_task route we have just defined.

Alternatively, we can also create a Task using the command line utility curl, which should exist on any Mac or Linux workstation. Execute the following command at your terminal, making sure to replace the {} with your ngrok forwarding URL:

```
curl -X POST https://taskrouter.twilio.com/v1/Workspaces/{WorkspaceSid}/Tasks
--data-urlencode Attributes='{"selected*language": "es"}'
-d WorkflowSid={WorkflowSid}
-u {AccountSid}:{AuthToken}
```

_If you don't have curl, you can run this request using an HTTP test tool or using the Task creation dialog in the TaskRouter web portal: with your Workspace open, click 'Tasks' then 'Create Task'._

## Make and Eligible Worker Available

Loog again at the TaskRouter Task lifecycle

Task Created → **eligible Worker becomes available** → Worker reserved → Reservation accepted → Task assigned to Worker.

The first stage – 'Task Created' – is complete. To trigger an automatic Task Reservation, the next step is to bring an eligible Worker online.

Therefore, with your Workspace open in the TaskRouter web portal, click 'Workers', then click to edit Alice and set her Activity to 'Idle':

**image SetAliceToIdle.original**

When you hit save, Twilio will create a Reservation between Alice and our Task and you will receive a Webhook request at the Assignment Callback URL that we set up in the previous step. If you're using ngrok, open http://localhost:4040 in your web browser to see a detailed log of the request that Twilio made to your server, including all the parameters that your server might use to determine whether to accept a Reservation:

**imageReservationCreatedNgrokLog.original**
We're now one step further along the Task Reservation lifecycle:

Task Created → eligible Worker becomes available → Worker reserved → Reservation accepted → Task assigned to Worker.

Time to accept the Reservation.

# Creating Tasks and Accepting Reservations: Accept a Reservation using the REST API

To indicate that a Worker has accepted or rejected a Task, you make an HTTP POST request to a Reservation instance resource. To do that, we need the TaskSid, which is available via the web portal, and the ReservationSid. The ReservationSid was passed to our Assignment Callback URL when a Worker was reserved for our Task. Using the ngrok inspector page at http://localhost:4040, we can easily find the request parameters sent from TaskRouter and copy the ReservationSid to our clipboard. \*\*

> The Reservation API resource is ephemeral and exists only within the context of a Task. As such, it doesn't have its own primary API resource and you'll find it documented in the Tasks resource section of the reference documentation.

With our trusty TaskSid and ReservationSid in hand, let's make another REST API request to accept our Task Reservation. We'll add on to our run.py to accept a reservation with our web server. Remember to substitute your own account details in place of the curly braces.

### server.js

```javascript
//imports
require("dotenv").config();
const express = require("express");
const twilio = require("twilio");

//express setup
const port = 3000;
const app = express();

//account information
const account_sid = process.env.TWILIO_ACCOUNT_SID;
const auth_token = process.env.TWILIO_AUTH_TOKEN;
const workspace_sid = process.env.TWILIO_WORKSPACE_SID;
const workflow_sid = process.env.TWILIO_WORKFLOW_SID;
//twilio setup

app.get("/assignment_callback", (req, res) => {
  console.log("assignment_callback");
  res.status(200).json({});
});
app.post("/assignment_callback", (req, res) => {
  console.log("assignment_callback");
  res.status(200).json({});
});

app.get("/create_task", (req, res) => {
  //Create a task
  client.taskrouter
    .workspaces(workspace_sid)
    .tasks.create({
      workflowSid: workflow_sid,
      attributes: JSON.stringify({
        selected_language: "es",
      }),
    })
    .then((task) => {
      // console.log(task.sid);
      res.send(`task ${task.sid}`);
    });

  app.get("/accept_reservation", (req, res) => {
    //accept reservation
    task_sid = req.query.task_sid;
    reservation_sid = req.query.reservation_sid;
    client.taskrouter
      .workspaces(workspace_sid)
      .tasks(task_sid)
      .update({
        reservationStatus: "accepted",
      })
      .then((task) => {
        res.status(200).json(`"task" : ${task_sid}`);
      });
  });
});

app.listen(port, () =>
  console.log(`Taskrouter app listening on port ${port}!`)
);
```

If you'd like to use curl instead, put the following into your terminal:

```
curl -X POST https://taskrouter.twilio.com/v1/Workspaces/{WorkspaceSid}/Tasks/{TaskSid}/Reservations/{ReservationSid}
-d ReservationStatus=accepted
-u {AccountSid}:{AuthToken}
```

Examining the response from TaskRouter, we see that the Task Reservation has been accepted, and the Task has been assigned to the our Worker Alice:

```json
{... "worker_name": "Alice", "reservation_status": "accepted", ...}
```

If you don't see this, it's possible that your Reservation has timed out. If this is the case, set your Worker back to an available Activity state and create another Task. To prevent this occuring, you can increase the 'Task Reservation Timeout' value in your Workflow configuration.

With your Workspace open in the TaskRouter web portal, click 'Workers' and you'll see that Alice has been transitioned to the 'Assignment Activity' of the TaskQueue that assigned the Task. In this case, "Busy":

**IMAGE: AliceWorkerNowBusy.original**
Hurrah! We've made it to the end of the Task lifecycle:

Task Created → eligible Worker becomes available → Worker reserved → Reservation accepted → **Task assigned to Worker**.

In the next steps, we'll examine more ways to perform common Task acception and rejection workflows.

[Next: Accept a Reservation using Assignment Instructions »](https://www.twilio.com/docs/quickstart/python/taskrouter/reservations-accept-callback)

\*\* If you're not using ngrok or a similar tool, you can modify run.py to print the value of ReservationSid to your web server log. Or, you can use the [Tasks REST API](https://www.twilio.com/docs/taskrouter/tasks) instance resource to look up the ReservationSid based on the TaskSid.

# Creating Tasks and Accepting Reservations: Accept a Reservation using Assignment Callback Instructions

Remember when we created a Task and accepted it using the Reservations subresource of the REST API? I do. And it was grand.

This time, we'll create another Task, again using the REST API, but we will have our server accept the Reservation as soon as it is notified, via a synchronous HTTP response.

Before we create the next Task, once again make sure that our Worker Alice is in a non-available Activity state.

Call the Create Task endpoint exposed with run.py again, or execute the following curl command:

```
curl https://taskrouter.twilio.com/v1/Workspaces/{WorkspaceSid}/Tasks \
--data-urlencode Attributes='{"selected_language": "es"}' \
-d WorkflowSid={WorkflowSid} \
-u {AccountSid}:{AuthToken}
```

This time, before bringing Alice online, we need to make changes to our assignment_callback method in our server.js. Open it and modify the existing code to reflect the following:

#Creating Tasks and Accepting Reservations: Accept a Reservation using the REST API
Remember when we created a Task and accepted it using the Reservations subresource of the REST API? I do. And it was grand.

This time, we'll create another Task, again using the REST API, but we will have our server accept the Reservation as soon as it is notified, via a synchronous HTTP response.

Before we create the next Task, once again make sure that our Worker Alice is in a non-available Activity state.

Call the Create Task endpoint exposed with run.py again, or execute the following curl command:

```
curl https://taskrouter.twilio.com/v1/Workspaces/{WorkspaceSid}/Tasks \
--data-urlencode Attributes='{"selected_language": "es"}' \
-d WorkflowSid={WorkflowSid} \
-u {AccountSid}:{AuthToken}
```

This time, before bringing Alice online, we need to make changes to our assignment_callback method in our run.py. Open it and modify the existing code to reflect the following:

### server.js

this needs to be readressed

```javascript
//imports
require("dotenv").config();
const express = require("express");
const twilio = require("twilio");

//express setup
const port = 3000;
const app = express();

//account information
const account_sid = process.env.TWILIO_ACCOUNT_SID;
const auth_token = process.env.TWILIO_AUTH_TOKEN;
const workspace_sid = process.env.TWILIO_WORKSPACE_SID;
const workflow_sid = process.env.TWILIO_WORKFLOW_SID;
//twilio setup

app.get("/assignment_callback", (req, res) => {
  console.log("assignment_callback");
  res.status(200).json({});
});
app.post("/assignment_callback", (req, res) => {
  console.log("assignment_callback");
  res.status(200).json({});
});

app.get("/create_task", (req, res) => {
  //Create a task
  client.taskrouter
    .workspaces(workspace_sid)
    .tasks.create({
      workflowSid: workflow_sid,
      attributes: JSON.stringify({
        selected_language: "es",
      }),
    })
    .then((task) => {
      // console.log(task.sid);
      res.send(`task ${task.sid}`);
    });

  app.get("/accept_reservation", (req, res) => {
    //accept reservation
    task_sid = req.query.task_sid;
    reservation_sid = req.query.reservation_sid;
    client.taskrouter
      .workspaces(workspace_sid)
      .tasks(task_sid)
      .update({
        reservationStatus: "accepted",
      })
      .then((task) => {
        res.status(200).json({});
      });
  });
});

app.listen(port, () =>
  console.log(`Taskrouter app listening on port ${port}!`)
);
```
