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

    // run when ready
    bot.on("ready", () => {
        console.info(`Logged in as ${bot.user.tag}`);

        // Login to API cods
        codApi.login().then(() => {
            console.log('Logged to COD API')
            startTrackStats(bot);
            bot.user.setActivity({
                name: "for '!wz' commands",
                type: "WATCHING",
            });
        }).catch(console.error);
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
