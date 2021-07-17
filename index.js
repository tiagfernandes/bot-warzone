const discord = require("discord.js");
const bot = new discord.Client();

const db = require("./db");
const { controller } = require("./controller");
const codApi = require("./cod-api");
const { startTrackStats } = require("./commands/track");

init();

// run all setup tasks and then start discord bot
async function init() {
    await db.init();
    await initBot();
}

async function initBot() {
    // login to bot
    bot.login(process.env.TOKEN);

    // Login to API cods
    codApi.login();

    // run when ready
    bot.on("ready", () => {
        bot.user.setActivity({ name: "for '!wz' commands", type: "WATCHING" });
        console.info(`Logged in as ${bot.user.tag}`);

        startTrackStats();
    });

    // run when message received
    bot.on("message", async (msg) => {
        // only respond to messages starting with !wz
        if (!msg.content.startsWith("!wz")) {
            return;
        }

        console.log(
            `[${new Date().toISOString()}] [${msg.author.username}] ${
                msg.content
            }`
        );

        // forward to controller
        controller(msg);
    });
}

process.on("unhandledRejection", (reason, p) => {
    console.log(p);
    console.log(reason);
    console.log("Unhandled Rejection at: Promise", p, "reason:", reason);
    // application specific logging, throwing an error, or other logic here
});
