const DiscordJS = require("discord.js");
const client = new DiscordJS.Client({
    partials: ["MESSAGE", "CHANNEL", "REACTION"],
});
const CronJob = require("cron").CronJob;

const db = require("./db");
const { controller } = require("./controller");
const codApi = require("./cod-api");

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
const { setRolePlayer, setChannelInfo } = require("./commands/admin");
const slashCommands = require("./slash-commands");
const { REACTION_ACCEPT } = require("./commands/admin");

init();

// run all setup tasks and then start discord bot
async function init() {
    await db.init();
    await initBot();
}

async function initBot() {
    // login to bot
    client.login(process.env.TOKEN);

    // run when ready
    client.once("ready", async () => {
        console.info(`Logged in as ${client.user.tag}`);

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

            switch (command) {
                case slashCommands.ADMIN_ROLE_PLAYER:
                    setRolePlayer(client, interaction, args);
                    break;
                case slashCommands.ADMIN_CHANNEL_INFO:
                    setChannelInfo(client, interaction, args);
                    break;
                case slashCommands.ADMIN_CHANNEL_TRACK:
                    setChannelTrack(client, interaction, args);
                    break;
                case slashCommands.PLAYER_STATS:
                    if (args.hasOwnProperty(slashCommands.PLAYER_STATS_ME)) {
                        // Stats me
                        stats(client, interaction);
                    } else if (
                        args.hasOwnProperty(slashCommands.PLAYER_STATS_PLAYER)
                    ) {
                        // Stats player
                        stats(client, interaction, args["player"]);
                    }
                    break;
                case slashCommands.REGISTER_REGISTER:
                    registerUser(client, interaction, args);
                    break;
                case slashCommands.REGISTER_UNREGISTER:
                    unregisterUser(client, interaction);
                    break;
                case slashCommands.REGISTER_CHANGE_PLAYER:
                    changeUser(client, interaction, args);
                    break;
                case slashCommands.TRACK_TRACK:
                    track(client, interaction);
                    break;
                case slashCommands.TRACK_UNTRACK:
                    untrack(client, interaction);
                    break;
                default:
                    break;
            }
        });

        // Login to API cods
        codApi
            .login()
            .then(() => {
                console.log("Logged to COD API");
                initCronJob(client);
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
        controller(client, msg);
    });

    client.on("messageReactionAdd", async (reaction, user) => {
        // When a reaction is received, check if the structure is partial
        if (reaction.partial) {
            // If the message this reaction belongs to was removed, the fetching might result in an API error which should be handled
            try {
                await reaction.fetch();
            } catch (error) {
                console.error(
                    "Something went wrong when fetching the message: ",
                    error
                );
                // Return as `reaction.message.author` may be undefined/null
                return;
            }
        }
        // Find one server with guildId, channelId and messageId
        const guildId = reaction.message.guild.id;
        const channelId = reaction.message.channel.id;
        const messageId = reaction.message.id;

        const server = await db.getServerByGuildChannelMessage(
            guildId,
            channelId,
            messageId
        );
        if (server) {
            // If reaction == reaction for accept
            if (reaction._emoji.name == REACTION_ACCEPT) {
                // Add Role for user (Id registered)
                reaction.message.guild
                    .member(user.id)
                    .roles.add(server.role_player_id);
            }
        }
    });

    client.on("messageReactionRemove", async (reaction, user) => {
        // Find one server with guildId, channelId and messageId
        const guildId = reaction.message.guild.id;
        const channelId = reaction.message.channel.id;
        const messageId = reaction.message.id;

        const server = await db.getServerByGuildChannelMessage(
            guildId,
            channelId,
            messageId
        );
        if (server) {
            // If reaction == reaction for accept
            if (reaction._emoji.name == REACTION_ACCEPT) {
                // Add Role for user (Id registered)
                reaction.message.guild
                    .member(user.id)
                    .roles.remove(server.role_player_id);
            }
        }
    });
}

const initCronJob = (client) => {
    let job = new CronJob(
        "*/60 * * * * *",
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
