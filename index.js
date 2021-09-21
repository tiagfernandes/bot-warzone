const DiscordJS = require("discord.js");
const client = new DiscordJS.Client({ partials: ["MESSAGE", "REACTION"] });
const CronJob = require("cron").CronJob;

const db = require("./db");
const { controller } = require("./controller");
const codApi = require("./cod-api");
const { initSlashCommands } = require("./shash-commands");

const {
    setChannelTrack,
    getMatchTracked,
    track,
    untrack,
} = require("./commands/track");
const { stats } = require("./commands/player");
const {
    registerUser,
    changeUser,
    unregisterUser,
} = require("./commands/register");

init();

// run all setup tasks and then start discord bot
async function init() {
    await db.init();
    await initBot();
}

const getApp = (guildId) => {
    const app = client.api.applications(client.user.id);
    if (guildId) {
        app.guilds(guildId);
    }
    return app;
};

async function initBot() {
    // login to bot
    client.login(process.env.TOKEN);

    // run when ready
    client.once("ready", async () => {
        initCronJob(client);

        console.info(`Logged in as ${client.user.tag}`);

        const guildId = process.env.GUILD_ID;

        console.log("initSlashCommands");
        // await initSlashCommands(client);

        const commands = await getApp(guildId).commands.get();
        console.log(commands);

        client.ws.on("INTERACTION_CREATE", async (interaction) => {
            const { name, options: optionsData } = interaction.data;

            const command = name.toLowerCase();

            const args = {};

            if (optionsData) {
                for (const option of optionsData) {
                    const { name, value, options } = option;
                    if (options) {
                        args[name] = options[0].value;
                    } else {
                        args[name] = value;
                    }
                }
            }

            console.log("Command ", command);
            console.log("Options ", optionsData);
            console.log("Args ", args);

            switch (command) {
                case "register":
                    registerUser(client, interaction, args);
                    break;
                case "change-player":
                    changeUser(client, interaction, args);
                    break;
                case "unregister":
                    unregisterUser(client, interaction);
                    break;
                case "channel-track":
                    setChannelTrack(client, interaction, args);
                    break;
                case "stats":
                    if (args.hasOwnProperty("me")) {
                        // Stats me
                        stats(client, interaction);
                    } else if (args.hasOwnProperty("player")) {
                        // Stats player
                        stats(client, interaction, args["player"]);
                    }
                    break;
                case "track":
                    console.log("TRACK");
                    track(client, interaction);
                    break;
                case "untrack":
                    untrack(client, interaction);
                    break;
                default:
                    break;
            }

            // if (command === "ping") {
            //     reply(interaction, "pong");
            // } else if (command === "embed") {
            //     const embed = new DiscordJS.MessageEmbed().setTitle(
            //         "Example Embed"
            //     );

            //     for (const arg in args) {
            //         const value = args[arg];
            //         embed.addField(arg, value);
            //     }

            //     reply(interaction, embed);
            // }
        });

        // Login to API cods
        codApi
            .login()
            .then(() => {
                console.log("Logged to COD API");

                return;
                // startTrackStats(bot);
            })
            .catch(console.error);
    });

    // run when message received
    client.on("message", async (msg) => {
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

const initCronJob = (client) => {
    let job = new CronJob(
        "*/30 * * * * *",
        function () {
            getMatchTracked(client);
        },
        null,
        true,
        "Europe/Paris"
    );
    job.start();
};

process.on("unhandledRejection", (reason, p) => {
    console.log(p);
    console.log(reason);
    console.log("Unhandled Rejection at: Promise", p, "reason:", reason);
    // application specific logging, throwing an error, or other logic here
});
