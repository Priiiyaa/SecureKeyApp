import { createTransport } from "nodemailer";

export const sendMail = async (email, subject, html) =>{


    const transport = createTransport({
        service: "Gmail",
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: true,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
        from: process.env.SMTP_USER
    });


    await transport.sendMail({
        from: process.env.SMTP_USER,
        to: email,
        subject,
        html,
    })
}