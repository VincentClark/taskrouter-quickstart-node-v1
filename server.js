//imports
require('dotenv').config();
const express = require('express');
const { urlencoded } = require('body-parser');
const twilio = require('twilio');
const pug = require('pug');
const VoiceResponse = require('twilio').twiml.VoiceResponse;

const taskrouter = require('twilio').jwt.taskrouter;
const TASKROUTER_BASE_URL = 'https://taskrouter.twilio.com';
const TaskRouterCapability = taskrouter.TaskRouterCapability;
const Policy = TaskRouterCapability.Policy;
const util = taskrouter.util;
const version = 'v1';

//express setup
const port = 3000;
const app = express();
app.use(urlencoded({ extended: false }));
app.set('view engine', 'pug');
app.set('views', './views');

//account information
const account_sid = process.env.TWILIO_ACCOUNT_SID;
const auth_token = process.env.TWILIO_AUTH_TOKEN;
const workspace_sid = process.env.TWILIO_WORKSPACE_SID;
const workflow_sid = process.env.TWILIO_WORKFLOW_SID;
const worker_neva_sid = process.env.TWILIO_WORKER_ALICE_SID;
const worker_zoe_sid = process.env.TWILIO_WORKER_ZOE_SID;
const post_worker_activity_sid = process.env.TWILIO_POST_WORKER_ACTIVITY;
//twilio setup
const client = twilio(account_sid, auth_token);
const task_sid = '';

app.get('/assignment_callback', (req, res) => {
    //used for accessing via browser, only to test the callback
    console.log('assignmeegnt get callback');
    console.log("tasksid", req.body)
    res.status(200).json({ "instruction": "accept", "activity_sid": post_worker_activity_sid, "channelId": worker_neva_sid });
});

/*
    Ideally, you want three numbers. 
    1. The number that you want to call. (+16267654137)
    2. The number to your worker Neva (+16268985404)
    3. The number you are calling from. 
    Remember that #1 and #2 numbers must be in your Twilio account as verified numbers.
*/
app.post('/assignment_callback', (req, res) => {
    //accsessed via twilio
    //console.log(req.body);
    // console.log('assignmeegnt post callback');
    // res.status(200).json({ "instruction": "accept", "activity_sid": post_worker_activity_sid, "channelId": worker_neva_sid });
    const ret =
    {
        "to": "+16268985404", // the number to your worker
        "instruction": "dequeue",
        "from": "+16267654137", // the number to your client
        "activity_sid": post_worker_activity_sid
    }
    res.status(200).json({ ret });
});

app.get('/create_task', (req, res) => {
    //Create a task
    client.taskrouter.workspaces(workspace_sid).tasks.create({
        workflowSid: workflow_sid,
        attributes: JSON.stringify({
            'selected_language': 'es'
        })
    }).then(task => {
        console.log(task.sid);
        res.send(`task ${task.sid}`);
    }
    );
});

app.get('/accept_reservation', (req, res) => {
    //accept reservation
    //ensure your url matches http://localhost:3000/accept_reservation?task_sid={task_sid}&reservation_sid={reservation_sid}
    let task_sid = req.query.task_sid;
    let reservation_sid = req.query.reservation_sid;
    console.log("task", task_sid);
    console.log("reservation", reservation_sid);
    try {

        let reservation = client.taskrouter.workspaces(workspace_sid)
            .tasks(task_sid)
            .reservations(reservation_sid)
            .update({ reservationStatus: 'accepted' })
            .then(reservation => {
                console.log("reservation!", reservation);
                res.status(200).json({ "reservation_status_server": reservation.reservationStatus, "reservation_worker": reservation.workerName });
            }
            );
    } catch (err) {
        console.log(err);
        res.status(500).json({ "message": "error", "error": err })
    }
});

//incomming call
app.post('/incoming_call', (req, res) => {
    try {
        const twiml = new VoiceResponse();
        twiml.say(
            {
                voice: 'alice',
            }, 'Welcome to the Call'
        );
        //
        const g = twiml.gather({
            method: 'POST',
            numDigits: 1,
            action: '/enqueue_call',
            timeout: 50
        });
        g.say(
            {
                voice: 'alice',
                language: 'en-US'
            }, 'For English press 1', { language: 'en' });
        g.say(
            {
                voice: 'alice',
                language: 'es-MX'
            }, 'Para español presione 2', { language: 'es' });
        //send to Twilio as twiml
        res.status(200).send(twiml.toString());
    } catch (err) {
        console.log(err);
        res.status(500).json({ "message": "error" });
    }
});

app.post('/enqueue_call', (req, res) => {
    const digit_pressed = req.body.Digits;
    try {
        const language = (digits) => (digits === '1') ? 'en' : 'es';
        const twiml = new VoiceResponse();
        const enqueue = twiml.enqueue(
            {
                workflowSid: workflow_sid,
            }
        )
        enqueue.task(`{"selected_language":"${language(digit_pressed)}"}`);
        res.setHeader('Content-Type', 'text/xml');
        res.status(200).send(enqueue.toString());
    } catch (err) {
        console.log(err);
        res.status(500).send(err);

    }
});
function buildWorkspacePolicy(options) {
    options = options || {};
    let resources = options.resources || [];
    let postFilter = options.postFilter || {};
    var urlComponents = [TASKROUTER_BASE_URL, version, 'Workspaces', workspace_sid]
    const policy = new Policy({
        url: urlComponents.concat(resources).join('/'),
        method: options.method || 'GET',
        postFilter: postFilter,
        allow: true
    });
    return policy;
}

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


    eventBridgePolicies.concat(workerPolicies).concat(workspacePolicies).forEach(policy => {
        capability.addPolicy(policy);
    });
    console.log(capability)
    let worker_token = capability.toJwt();
    res.status(200).
        render('agents.pug', {
            worker_token: worker_token
        });
});
//sync
app.listen(port, () => console.log(`Taskrouter app listening on port ${port}!`));