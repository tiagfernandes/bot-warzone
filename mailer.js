"use strict";

require("dotenv").config();

const nodemailer = require("nodemailer");

/**
 * Send error email
 * @param {string} text
 */
async function sendError(text) {
    // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport({
        host: process.env.MAILER_HOST,
        port: process.env.MAILER_PORT,
        auth: {
            user: process.env.MAILER_AUTH_USER, // generated ethereal user
            pass: process.env.MAILER_AUTH_PASS, // generated ethereal password
        },
    });

    // send mail with defined transport object
    let info = await transporter.sendMail({
        from: process.env.MAILER_FROM, // sender address
        to: process.env.MAILER_TO, // list of receivers
        subject: "Error with bot", // Subject line
        text: text, // plain text body
    });

    console.log("Message sent: %s", info.messageId);
}

module.exports = { sendError }