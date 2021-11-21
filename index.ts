import { createInterface } from "readline";
import * as AWS from "aws-sdk";

interface Participant {
    name: string;
    email: string;
}

const SES = new AWS.SES({ region: process.env.AWS_REGION ?? "eu-west-1" });

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const waitForInput = (prompt: string): Promise<string> => {
    const inter = createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => inter.question(prompt, res => {
        inter.close();
        resolve(res);
    }));
}

const validateEmails = (participants: Array<Participant>) => {
    return participants.forEach(({ email }) => {
        // Just checks {something}@{something}.{something}
        if (!/.+@.+\..+/.test(email)) {
            console.error(`Not a valid email address: ${email}`);
            process.exit(1);
        }
    });
}

const confirmSenderEmail = async (senderEmail: string) => {
    const response = await waitForInput(
        `Is this the email you wish to send invites from?\n` +
        `${senderEmail}\n` +
        `Press enter to confirm, or enter any character and press enter to exit.`
    );
    if (response.trim() !== "") {
        console.log("Exiting...");
        process.exit(0);
    }
}

const isVerified = async (senderEmail: string) => {
    const res = await SES.getIdentityVerificationAttributes({ Identities: [senderEmail] }).promise();
    return res.VerificationAttributes[senderEmail]?.VerificationStatus === "Success";
}

const verifyEmail = async (emailAddress: string) => {
    await SES.verifyEmailIdentity({ EmailAddress: emailAddress }).promise();
    console.log(`Please check your inbox at ${emailAddress} to verify you email with SES.`)
    do {
        await sleep(3000);
        process.stdout.write(".");
    } while (!(await isVerified(emailAddress)))
    process.stdout.write("\n");
}

const shuffle = (array: Array<any>) => {
    let randomIndex;
    for (let currentIndex = array.length - 1; currentIndex > 0; currentIndex--) {
        randomIndex = Math.floor(Math.random() * (currentIndex + 1));
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
}

const sendEmails = async (participants: Array<Participant>, senderEmail: string) => {
    for (let i = 0; i < participants.length; i++) {
        const giver = participants[i];
        const receiver = i === participants.length - 1 ? participants[0] : participants[i + 1];
        await SES.sendEmail({
            Source: senderEmail,
            Destination: { ToAddresses: [giver.email] },
            Message: {
                Subject: { Data: "Shhhh! Secret Santa!" },
                Body: { Text: { Data: `You're buying for ${receiver.name}!` } },
            },
        }).promise();
    }
}

const main = async () => {
    const participants = require("./participants.json") as Array<Participant>;
    validateEmails(participants);
    const senderEmail = participants[0].email;
    await confirmSenderEmail(senderEmail);
    if (!(await isVerified(senderEmail))) {
        await verifyEmail(senderEmail);
    }
    console.log("Email verified wth SES.");
    shuffle(participants);
    await sendEmails(participants, senderEmail);
    console.log("Done! Happy santa-ing!")
}

main().catch(err => {
    console.error("An error occured:", err);
    process.exit(1);
});
