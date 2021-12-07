# Create Tasks from Phone Calls using TwiML: End-to-End Phone Call Task Assignment

So far in Part 3 we have laid the groundwork for creating a TaskRouter Task from an incoming phone call and connecting the call to an eligible Worker. It's time to test this from end-to-end and observe the events that occur as our Task is moved through its lifecycle.

First, once again ensure that our Worker Alice is in an unavailable Activity state.

Now call your Twilio phone number. If possible, use the phone that isn't set in Alice's contact_uri. When you hear the prompt, press two to select Spanish as your preferred language.

With your Workspace open in the [TaskRouter web portal](https://www.twilio.com/user/account/taskrouter/workspaces), click 'Tasks' and you should see a newly created Task in the 'Customer Care Requests - Spanish' Task Queue. Because there are no eligible Workers available, the Task's assignment status is 'pending':

**TASK IMAGE**
On the phone call, you should continue hear Twilio's default hold music.

Click 'Workers' in the main navigation and click to edit our Worker Alice. Change Alice's Activity to an available Activity type - in this case 'Idle':

**Alice propeties image**

When you click 'Save', TaskRouter will acknowledge that Alice has become available and will determine that she is eligible to handle our pending Task. A request is then made to the Assignment Callback URL.

In the previous step we configured the Assignment Callback URL to return a 'dequeue' instruction. This instructs Twilio to contact Alice at her <code>contact_uri</code> (in this case, your phone number) and when the call is picked up, bridge her to the caller who is still on hold.

At this point, the two parties are connected and should be able to hear one another speak. With your Workspace open in the [TaskRouter web portal](https://www.twilio.com/user/account/taskrouter/workspaces), click 'Tasks' in the main navigation and you'll see that the Task has been assigned successfully:

> If you don't receive a call to your Twilio number, make sure that your Twilio account has available credit, and that you have adequate international permissions enabled on your account. To verify this, use the Twilio API Explorer to try calling yourself in isolation of our TaskRouter app

When either party hangs up the call, you should see Alice transition to the WrapUp Activity unless Alice is in a Multitask workspace, in which Alice will be in Idle status. This is important for the next part of this tutorial.

In Part 4 we'll build a user interface for our Workers, enabling them to view and control their own availability. To do this, we'll use TaskRouter.js - a WebSocket powered JavaScript library.

[Part 4: Real-time Agent User Interface »](../part4/part4.md)

<details>
<summary>Click to expand navigation</summary>

- [Part 2](part2.md)
- [Overview](../overview.md)

</details>
