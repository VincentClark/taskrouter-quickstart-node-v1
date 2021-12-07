# Control Worker Activities using Worker.js: Add an Agent UI to our Project

Let's get started on our agent UI. Assuming you've followed the conventions so far in this tutorial, the UI we create will be accessible using your web browser at:

<code style="color:red;background-color:ivory">localhost:8080/agents?WorkerSid=WK01234012340123401234</code> (substitute your Alice's WorkerSid)

We pass the WorkerSid in the URL to avoid implementing complex user management in our demo. In reality, you are likely to store a user's WorkerSid in your database alongside other User attributes.

Let's add on our to our server.js file to add an endpoint to generate a page based on a template.

First we will need to bring in the needed libraries to create the JWT (Javascript Web Token) under the Twilio setup.

## server.js

```javascript
//twilio setup
const client = twilio(account_sid, auth_token);
const voice_client = twilio.twiml.VoiceResponse();
const taskrouter = require("twilio").jwt.taskrouter;
const TASKROUTER_BASE_URL = "https://taskrouter.twilio.com";
const TaskRouterCapability = taskrouter.TaskRouterCapability;
const Policy = TaskRouterCapability.Policy;
const util = taskrouter.util;
const version = "v1";
```

Once we have completed the Twilio setup for our "agent" route with the needed functions to set our JWT policies.

```javascript
app.get('/agents', (req, res) => {
    const worker_sid = res.query('worker_sid')

    const capability = new TaskRouterCapability({
        accountSid: account_sid,
        authToken: auth_token,
        workspaceSid: workspace_sid,
        channelId: worker_sid
    });
    const eventBridgePolicies = util.defaultEventBridgePolicies(account_sid, worker_sid);
    // Worker Policies
    const workerPolicies = util.defaultWorkerPolicies(version, workspace_sid, worker_sid);
    ];

    eventBridgePolicies.concat(workerPolicies).concat(workspacePolicies).forEach(policy => {
        capability.addPolicy(policy);
    });
    console.log(capability)
    let worker_token = capability.toJwt();

});
```

Next we will add the build policies to our agent route.

```javascript
app.get('/agents', (req, res) => {
    const worker_sid = worker_neva_sid;
    const capability = new TaskRouterCapability({
        accountSid: account_sid,
        authToken: auth_token,
        workspaceSid: workspace_sid,
        channelId: worker_sid
    });
    const eventBridgePolicies = util.defaultEventBridgePolicies(account_sid, worker_sid);
    // Worker Policies
    const workerPolicies = util.defaultWorkerPolicies(version, workspace_sid, worker_sid);

    const workspacePolicies = [
        // Workspace subresources fetch Policy for the specified worker in the workspace
        // Use wild card '**' to match all subresources of the workers in workspace

        buildWorkspacePolicy({
            resources: ['Workers', worker_sid],
            method: 'POST',
            allow: true,
            postFilter: { "ActivitySid": { 'required': true } }
        }),
        buildWorkspacePolicy({
            resources: ['Tasks', '**'],
            method: 'POST',
            allow: true,
        }),
        buildWorkspacePolicy({
            resources: ['Reservations', "**"],
            method: 'POST',
            allow: true,
        }),
    ];
```

We will then use the pug render template for our agent page. For this you will need to install "pugjs"

```
npm install --save pug
```

We will then need to require the library in our **imports**section

```javascript
//imports
require("dotenv").config();
const express = require("express");
const { urlencoded } = require("body-parser");
const twilio = require("twilio");
const pug = require("pug");
const VoiceResponse = require("twilio").twiml.VoiceResponse;
```

In our express set up section we need to set our rendering engine to use Pug.

```javascript
//express setup
const port = 3000;
const app = express();
app.use(urlencoded({ extended: false }));
app.set("view engine", "pug");
app.set("views", "./views");
```

Finally in our response we will build our JWT and then render the JWT in our template page.

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
const taskrouter = require("twilio").jwt.taskrouter;
const TASKROUTER_BASE_URL = "https://taskrouter.twilio.com";
const TaskRouterCapability = taskrouter.TaskRouterCapability;
const Policy = TaskRouterCapability.Policy;
const util = taskrouter.util;
const version = "v1";
//express setup
//express setup
const port = 3000;
const app = express();
app.use(urlencoded({ extended: false }));
app.set("view engine", "pug");
app.set("views", "./views");

//routes
app.post("/assignment_callback", (req, res) => {
  try {
    console.log("assignment_callback");
    res.status(200).json({
      instruction: "dequeue",
      from: "+15556666",
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
    twiml.say(
      {
        voice: "alice",
      },
      "Welcome to the Call"
    );
    //
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

app.get("/agents", (req, res) => {
  const worker_sid = req.query.worker_sid;
  const capability = new TaskRouterCapability({
    accountSid: account_sid,
    authToken: auth_token,
    workspaceSid: workspace_sid,
    channelId: worker_sid,
  });
  const eventBridgePolicies = util.defaultEventBridgePolicies(
    account_sid,
    worker_sid
  );
  // Worker Policies
  const workerPolicies = util.defaultWorkerPolicies(
    version,
    workspace_sid,
    worker_sid
  );
  function buildWorkspacePolicy(options) {
    options = options || {};
    let resources = options.resources || [];
    let postFilter = options.postFilter || {};
    var urlComponents = [
      TASKROUTER_BASE_URL,
      version,
      "Workspaces",
      workspace_sid,
    ];
    const policy = new Policy({
      url: urlComponents.concat(resources).join("/"),
      method: options.method || "GET",
      postFilter: postFilter,
      allow: true,
    });
    return policy;
  }

  const workspacePolicies = [
    // Workspace subresources fetch Policy for the specified worker in the workspace
    // Use wild card '**' to match all subresources of the workers in workspace

    buildWorkspacePolicy({
      resources: ["Workers", worker_sid],
      method: "POST",
      allow: true,
      postFilter: { ActivitySid: { required: true } },
    }),
    buildWorkspacePolicy({
      resources: ["Tasks", "**"],
      method: "POST",
      allow: true,
    }),
    buildWorkspacePolicy({
      resources: ["Reservations", "**"],
      method: "POST",
      allow: true,
    }),
  ];
  eventBridgePolicies
    .concat(workerPolicies)
    .concat(workspacePolicies)
    .forEach((policy) => {
      capability.addPolicy(policy);
    });
  console.log(capability);
  let worker_token = capability.toJwt();
  res.status(200).render("agents.pug", {
    worker_token: worker_token,
  });
});
//initalize server
app.listen(port, () =>
  console.log(`Taskrouter app listening on port ${port}!`)
);
```

Now that our server.js is set up, we will need to add the pug template.

1. Create a new directory named "views"
2. Create a new file name "agents.pug"
3. Copy the below code into your agents.pug file.

\_not sure if this will be the final code, it has some extra featues that might not be necissary.

## ./views/agents.pug

```javascript
doctype html
html
    head
        title Agents
        link(rel='stylesheet', href='//media.twiliocdn.com/taskrouter/quickstart/agent.css')
        script(
        src= 'https://sdk.twilio.com/js/taskrouter/v1.21/taskrouter.min.js'
        integrity= 'sha384-5fq+0qjayReAreRyHy38VpD3Gr9R2OYIzonwIkoGI4M9dhfKW6RWeRnZjfwSrpN8' crossorigin='anonymous')

        script.
            console.log("enter");
            // Subscribe to a subset of the available TaskRouter.js events for a worker sync
            function registerTaskRouterCallbacks() {
                worker.on('ready', function(worker) {
                    agentActivityChanged(worker.activityName);
                    logger("Succesffuly resgistered as: "+ worker.friendlyName)
                    logger("Currently active activity: " + worker.activityName)
                })

                worker.on("activity.update", function(worker) {
                    agentActivityChanged(worker.activityName);
                    logger("Worker activity changed to: " + worker.activityName);
                })

                worker.on("reservation.created", function(reservation) {
                    logger("------");
                    logger("You have been reserved to handle a call");
                    logger("Call from: " + reservation.task.attributes.from);
                    logger("Selected language:" + reservation.task.attributes.selected_language);
                    logger("------");
                })

                worker.on("reservation.accepted", function(reservation) {
                    logger("Reservation " + reservation.sid + " accepted");
                })

                worker.on("reservation.rejected", function(reservation) {
                    logger("Reservation " + reservation.sid + " rejected");
                })

                worker.on("reservation.timeout", function(reservation) {
                    logger("Reservation " + reservation.sid + " timed out");
                })
                worker.on('reservation.canceled', function(reservation) {
                    logger(`Reservation ${reservation.sid} ${canceled}`);
                })
            }
                // Hook up the agent Activity buttons to TaskRouter.js
            function bindAgentActivityButtons() {
                // Fetch the full list of available Activities from TaskRouter. Store each
                // ActivitySid against the matching Friendly Name
                var activitySids = {};
                worker.activities.fetch(function(error, activityList) {
                    var activities = activityList.data;
                    var i = activities.length;
                    while (i--) {
                        console.log(activities[i].friendlyName);
                        activitySids[activities[i].friendlyName] = activities[i].sid;
                    }
                });

                var elements = document.getElementsByClassName('change-activity');
                var i = elements.length;
                while (i--) {
                    elements[i].onclick = function() {
                        var nextActivity = this.dataset.nextActivity;
                        var nextActivitySid = activitySids[nextActivity];
                        worker.update({"ActivitySid":nextActivitySid});
                    }
                }
            }

            // Update the UI to reflect a change in Activity

            function agentActivityChanged(activity) {
                hideAgentActivities();
                showAgentActivity(activity);
            }

            function hideAgentActivities() {
                var elements = document.getElementsByClassName('agent-activity');
                var i = elements.length;
                while (i--) {
                    elements[i].style.display = 'none';
                }
            }

            function showAgentActivity(activity) {
                activity = activity.toLowerCase();
                var elements = document.getElementsByClassName(('agent-activity ' + activity));
                elements.item(0).style.display = 'block';
            }

            /* Other stuff */

            function logger(message) {
                var log = document.getElementById('log');
                log.value += "\n> " + message;
                log.scrollTop = log.scrollHeight;
            }

            window.onload = function() {
                console.log("onLoad")
                // Initialize TaskRouter.js on page load using window.workerToken -
                // a Twilio Capability token that was set from rendering the template with agents endpoint
                logger("Initializing...");
                window.worker = new Twilio.TaskRouter.Worker("#{worker_token}");

                registerTaskRouterCallbacks();
                bindAgentActivityButtons();
            };

    body
        div(class="content")
            section(class="agent-activity offline")
                p(class="activity")
                    span Offline
                button(class="change-activity" data-next-activity="Idle")
                    Go Idle
            section(class="agent-activity idle")
                p(class="activity")
                    span Idle
                button(class="change-activity" data-next-activity="Offline")
                    Go Offline
                button(class="change-activity" data-next-activity="Reserved")
                    Go Reserved
            section(class="agent-activity reserved")
                p(class="activity")
                    span Reserved
                button(class="change-activity" data-next-activity="Busy")
                    Go Busy
            section(class="agent-activity busy")
                p(class="activity")
                    span Busy
                button(class="change-activity" data-next-activity="WrapUp")
                    Go WrapUp
            section(class="agent-activity wrapup")
                p(class="activity")
                    span WrapUp
                button(class="change-activity" data-next-activity="Idle")
                        Go Idle
            section(class="log")
                textarea(id="log" readonly="true")
```

You will notice that we included two enternal files:

> -taskrouter.min.js is the primary TaskRouter.js JavaScript file that communicates with TaskRouter's infrastructure on our behalf. You can use this URL to include Worker.js in your production application, but first check the reference documentation to ensure that you include the latest version number.
> agent.css is a simple CSS file created for the purpose of this Quickstart. It saves us having to type out some simple pre-defined styles.

> -agent.css is a simple CSS file created for the purpose of this Quickstart. It saves us having to type out some simple pre-defined styles.

And that's it! Open <code style="color:red; background-color:ivory">localhost:8080/agents?WorkerSid={WK012340123401234}</code> in your browser and you should see the screen below. If you make the same phone call as we made in Part 3, ~~~you should see Alice's Activity transition on screen as she is reserved and assigned to handle the Task.~~~

If you see "Initializing..." and no progress, make sure that you have included the correct WorkerSid in the "WorkerSid" request parameter of the URL.

For more details, refer to the TaskRouter JavaScript SDK documentation.

Completed Agent UI

> -This simple PoC has been tested in the latest version of popular browsers, including IE 11. \*

**Need Image**

<details>
<summary>Click to expand navigation</summary>

- [Part 2](part2.md)
- [Overview](../overview.md)

</details>
