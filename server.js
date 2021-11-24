//imports
require('dotenv').config();
const express = require('express');
const { urlencoded } = require('body-parser');
const twilio = require('twilio');
const taskrouter = require('twilio').jwt.taskrouter;
const pug = require('pug');
const VoiceResponse = require('twilio').twiml.VoiceResponse;
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
const worker_neva_sid = process.env.TWILIO_WORKER_NEVA_SID;
const worker_zoe_sid = process.env.TWILIO_WORKER_ZOE_SID;
const post_worker_activity_sid = process.env.TWILIO_ACTIVITY_OFFLINE;
//twilio setup
const client = twilio(account_sid, auth_token);
const task_sid = '';

app.get('/assignment_callback', (req, res) => {
    //used for accessing via browser, only to test the callback
    console.log('assignmeegnt get callback');
    res.status(200).json({ "message": "success" });
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
    console.log('assignment_callback');
    const ret =
    {
        "to": "+16268985404", // the number to your worker
        "instruction": "dequeue",
        "from": "+16267654137", // the number to your client
        "post_work_activity_sid": post_worker_activity_sid
    }
    console.log(ret);
    res.status(200).json(ret);
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
    //ensure your url matches http://localhost:3000/accept_reservation?task_sid=<task_sid>
    let task_sid = req.query.task_sid;
    reservation_sid = req.query.reservation_sid;
    client.taskrouter.workspaces(workspace_sid).tasks(task_sid).update({
        reservationStatus: 'accepted'
    }).then(task => {
        res.status(200).json({ "message": "accepted" });
    }
    );
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
    var urlComponents = [TASKROUTER_BASE_URL, version, 'Workspaces', workspace_sid]
    return new Policy({
        url: urlComponents.concat(resources).join('/'),
        method: options.method || 'GET',
        allow: true
    });
}

app.get('/agents', (req, res) => {
    const worker_sid = worker_neva_sid;
    const capability = new TaskRouterCapability({
        accountSid: account_sid,
        authToken: auth_token,
        workspaceSid: workspace_sid,
        channelId: worker_sid
    });
    let eventBridgePolicies = util.defaultEventBridgePolicies(account_sid, worker_sid);
    // Worker Policies
    let workerPolicies = util.defaultWorkerPolicies(version, workspace_sid, worker_sid);

    let workspacePolicies = [
        // Workspace fetch Policy
        buildWorkspacePolicy(),
        // Workspace subresources fetch Policy
        buildWorkspacePolicy({ resources: ['**'], method: 'POST' }),
        // Workspace Activities Update Policy
        //buildWorkspacePolicy({ resources: ['Activities'], method: 'POST' }),
        // Workspace Activities Worker Reserations Policy
        //buildWorkspacePolicy({ resources: ['Workers', worker_sid, 'Reservations', '**'], method: 'POST' }),
    ];
    eventBridgePolicies.concat(workerPolicies).concat(workspacePolicies).forEach(function (policy) {
        capability.addPolicy(policy);
    });
    let worker_token = capability.toJwt();
    res.status(200).
        render('agents.pug', {
            worker_token: worker_token
        });
});
//sync
app.listen(port, () => console.log(`Taskrouter app listening on port ${port}!`));