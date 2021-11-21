A simple tool to email people their Secret Santa assignments.

### Usage

- Configure the AWS SDK. Ensure that your default profile has permissions to verify email addresses and send emails with SES. The default region is "eu-west-1"; export a different `AWS_REGION` value if you want to use a different region.
- Fill out `participants.json` with the name and email address of each participant. Your own email should go first, as this will be used as the sender email, and will need to be verified with SES.
- To email participants with the name of the person they're buying for, run `npm install && npm run main`.
