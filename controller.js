module.exports = { controller };

const { statsUser } = require("./commands/player");
const {
    registrants,
    registerUser,
    unregisterUser,
} = require("./commands/register");
const { track, untrack } = require("./commands/track");
    
const util = require("./util");

const commands = {
    me: {
        method: statsUser,
        syntax: "user",
        help: "Display stats of user",
        rx: /^!wz me$/,
    },
    users: {
        method: registrants,
        syntax: "users",
        help: "Prints list of all registered users",
        rx: /^!wz users$/,
    },
    register: {
        method: registerUser,
        syntax: "register <psn|xbl|battle|acti|uno> <username>",
        help: "Registers a new user",
        rx: /^!wz register (psn|xbl|battle|acti|uno) [0-9A-Za-z#_-]+$/,
    },
    unregister: {
        method: unregisterUser,
        syntax: "unregister <psn|xbl|battle|acti> <username>",
        help: "Unregisters a user",
        rx: /^!wz unregister (psn|xbl|battle|acti) [0-9A-Za-z#_-]+$/,
    },
    // single: {
    //     method: singleStats,
    //     syntax: "single <psn|xbl|battle|acti> <username>",
    //     help: "Display solo stats",
    //     rx: /^!wz single (psn|xbl|battle|acti) [0-9A-Za-z#_-]$/,
    // },
    track: {
        method: track,
        syntax: "track",
        help: "Track a player, each new finished game we detect will be publicly posted to the channel the tracking was created in.",
        rx: /^!wz track$/,
    },
    untrack: {
        method: untrack,
        syntax: "untrack",
        help: "Remove a tracking for player.",
        rx: /^!wz untrack$/,
    },
    help: {
        method: help,
        syntax: "help",
        help: "Shows this help",
        rx: /^!wz help$/,
    },
};

async function controller(msg) {
    // trim unnecessary spaces
    msg.content = msg.content.replace(/ +/g, " ").trim();

    // extract command name
    let cmd = util.tokenize(msg.content)[1];
    try {
        const command = commands[cmd];
        // check if command exists
        if (!command) {
            help(msg);
            return;
        }
        // check if syntax is okay
        if (!command.rx.test(msg.content)) {
            msg.reply(
                `Invalid syntax, use \`!wz ${command.syntax}\` instead.\nSend \`!wz help\` for more information.`
            );
            return;
        }
        // run command
        await command.method(msg);
    } catch (e) {
        console.error(e);
        msg.reply(e);
    }
}

async function help(msg) {
    let help = "\n**Warzone Stats Guide:**\n";
    for (let cmd in commands) {
        help += `\`${commands[cmd].syntax}\`: *${commands[cmd].help}*\n`;
    }
    msg.reply(help);
}
