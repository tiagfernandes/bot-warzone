module.exports = { controller, startTrackStats };

const db = require("./db");
const {
    sendUserStats,
    sendUserMatch,
    sendMatchStats,
    sendMatchStatsTest,
} = require("./stats");
const { getPlayerProfile, getBattleRoyaleMatchs } = require("./cod-api");
const util = require("./util");
const scheduler = require("./scheduler");

const commands = {
    me: {
        method: getUser,
        syntax: "user",
        help: "Display stats of user",
        rx: /^!wz me$/,
    },
    stats: {
        method: allStats,
        syntax: "stats",
        help: "Display stats of all registered users",
        rx: /^!wz stats$/,
    },
    users: {
        method: getUsers,
        syntax: "users",
        help: "Prints list of all registered users",
        rx: /^!wz users$/,
    },
    register: {
        method: registerUser,
        syntax: "register <psn|xbl|battle|acti> <username>",
        help: "Registers a new user",
        rx: /^!wz register (psn|xbl|battle|acti) [0-9A-Za-z#_-]+$/,
    },
    unregister: {
        method: unregisterUser,
        syntax: "unregister <psn|xbl|battle|acti> <username>",
        help: "Unregisters a user",
        rx: /^!wz unregister (psn|xbl|battle|acti) [0-9A-Za-z#_-]+$/,
    },
    single: {
        method: singleStats,
        syntax: "single <psn|xbl|battle|acti> <username>",
        help: "Display solo stats",
        rx: /^!wz single (psn|xbl|battle|acti)$/,
    },
    track: {
        method: track,
        syntax: "track",
        help:
            "Track a player, each new finished game we detect will be publicly posted to the channel the tracking was created in.",
        rx: /^!wz track$/,
    },
    untrack: {
        method: untrack,
        syntax: "untrack",
        help: "Remove a tracking for player.",
        rx: /^!wz untrack$/,
    },
    // unschedule: {
    //     method: unscheduleStats,
    //     syntax: "unschedule",
    //     help: "Unschedule automatic stats posting",
    //     rx: /^!wz unschedule$/,
    // },
    help: {
        method: help,
        syntax: "help",
        help: "Shows this help",
        rx: /^!wz help$/,
    },
    // teams: {
    //     method: teamSplit,
    //     syntax: "teams <players-per-team>",
    //     help: "Randomly splits users into teams",
    //     rx: /^!wz teams [0-9]+$/,
    // },
    // test: {
    //     method: test,
    //     syntax: "test",
    //     help: "Randomly splits users into teams",
    //     rx: /^!wz test$/,
    // },
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

async function allStats(msg) {
    let tokens = util.tokenize(msg.content);
    let users = await db.getAllUsers(msg.channel.id);

    // check if any users registered
    if (users.length == 0) {
        msg.reply("No users registered!");
        return;
    }

    // prepare reply
    let i = 0;
    // for each user, call the sendStats function with a 3s delay to prevent API exhaustion
    users.forEach(async (u) => {
        // send initial message for further editing
        let msgObj = await msg.reply(
            `Fetching stats for **${util.escapeMarkdown(u.username)}** (${
                u.platform
            })...`
        );
        setTimeout(sendUserStats(u, 0, msgObj), i++ * 3000);
    });
}

/**
 * Return stats for user
 * @param {*} msg
 */
async function getUser(msg) {
    let user = await db.getUser(msg.author.id);
    if (!user) {
        msg.reply("You are not registered.");
    } else {
        let msgObj = await msg.reply(
            `Fetching stats for **${util.escapeMarkdown(user.username)}** (${
                user.platform
            })...`
        );
        await sendUserStats(user, 0, msgObj)();
    }
}

async function getUsers(msg) {
    let users = await db.getAllUsers(msg.channel.id);
    if (users.length > 0) {
        users = users.map(
            (x) => `${util.escapeMarkdown(x.username)} (${x.platform})`
        );
        msg.reply(`\nRegistered users:\n${users.join("\n")}`);
    } else {
        msg.reply("No users have been registered.");
    }
}

async function registerUser(msg) {
    let tokens = util.tokenize(msg.content);
    let username = tokens[3];
    let platform = tokens[2];

    let user = await db.getUserFromChannel(msg.channel.id, username, platform);

    if (user) {
        msg.reply(`**${username}** (${platform}) already exist!`);
    } else {
        let player = await getPlayerProfile(platform, username);
        if (player) {
            await db.addUserToChannel(
                msg.channel.id,
                player.username,
                player.platform
            );
            await db.addUser(msg.author.id, player.username, player.platform);

            msg.reply(
                `**${player.username}** (${player.platform}) has been registered!`
            );
        } else {
            msg.reply(
                `**${username}** (${platform}) does not exist or private (see https://my.callofduty.com/fr/dashboard)!`
            );
        }
    }
}

async function unregisterUser(msg) {
    let tokens = util.tokenize(msg.content);
    let username = tokens[3];
    let platform = tokens[2];

    let player = await db.getUserFromChannel(
        msg.channel.id,
        username,
        platform
    );

    if (player) {
        await db.removeUserFromChannel(
            msg.channel.id,
            player.username,
            player.platform
        );
        msg.reply(
            `**${util.escapeMarkdown(player.username)}** (${
                player.platform
            }) has been unregistered!`
        );
    } else {
        msg.reply(
            `**${util.escapeMarkdown(
                username
            )}** (${platform}) has not been registered!`
        );
    }
}

async function singleStats(msg) {
    let tokens = util.tokenize(msg.content);
    let username = tokens[4];
    let platform = tokens[3];

    let player = await getPlayerProfile(platform, username);
    if (player) {
        let msgObj = await msg.reply(
            `Fetching stats for **${util.escapeMarkdown(player.username)}** (${
                player.platform
            })...`
        );
        await sendStats(player, 0, msgObj, duration, mode)();
    } else {
        msg.reply(`**${username}** (${platform}) does not exist!`);
    }
}

async function track(msg) {
    let user = await db.getUser(msg.author.id);
    if (!user) {
        msg.reply("You are not registered.");
    } else {
        await db.trackUser(user.userId, msg.channel.id);
        await msg.reply(
            `**${util.escapeMarkdown(user.username)}** (${
                user.platform
            }) tracked !`
        );
    }
}

async function untrack(msg) {
    let user = await db.getUser(msg.author.id);
    if (!user) {
        msg.reply("You are not registered.");
    } else {
        await db.untrackUser(user.userId, msg.channel.id);
        await msg.reply(
            `**${util.escapeMarkdown(user.username)}** (${
                user.platform
            }) you are untracked !`
        );
    }
}

async function startTrackStatsTempo(client) {
    setInterval(async () => {
        try {
            // Get all users tracked
            let users = await db.getAllUsersTracked();

            // If no users, do nothing
            if (users.length > 0) {
                let arrayMatchs = [];

                // For each users
                for (const user of users) {
                    console.log(`Traitement de ${user.username}`);
                    try {
                        // Get lasts matchs of user
                        let matchs = await getBattleRoyaleMatchs(
                            user.platform,
                            user.username
                        );

                        // Select the last one
                        const playerLastGame = matchs[0];
                        const matchId = playerLastGame.matchID;

                        // New date to compare if math is recent
                        let compareDate = new Date();
                        compareDate.setMinutes(
                            compareDate.getMinutes() - process.env.MAX_DURATION
                        );

                        if (
                            new Date(playerLastGame.utcEndSeconds * 1000) >=
                            compareDate
                        ) {
                            // Get last game Saved
                            const lastGame = await db.getLastMatchFromUser(
                                user.userId
                            );

                            // Si la derniere partie est enregistrée et que le matchId est le meme ignorer
                            if (!lastGame || lastGame.matchId != matchId) {
                                console.log(
                                    `La game ${matchId} de ${user.username} n'a pas été traitée`
                                );

                                // Set Last match in bdd
                                await db.addMatchFromUser(user.userId, matchId);

                                const stats = {
                                    user,
                                    playerLastGame,
                                };

                                arrayMatchs[playerLastGame.matchID]
                                    ? arrayMatchs[playerLastGame.matchID].push(
                                          stats
                                      )
                                    : (arrayMatchs[playerLastGame.matchID] = [
                                          stats,
                                      ]);
                            }
                        }
                    } catch (Error) {
                        console.log(Error);
                    }
                    console.log(`Fin traitement de ${user.username}`);
                }

                sendMatchStats(arrayMatchs, client);
            }
        } catch (Error) {
            //Handle Exception
            console.error(Error);
        }
    }, process.env.FIND_GAME_INTERVAL * 1000);
}

async function unscheduleStats(msg) {
    await scheduler.unschedule(msg.channel.id);
    msg.reply("Stats unscheduled!");
}

async function help(msg) {
    let help = "\n**Warzone Stats Guide:**\n";
    for (let cmd in commands) {
        help += `\`${commands[cmd].syntax}\`: *${commands[cmd].help}*\n`;
    }
    msg.reply(help);
}

async function teamSplit(msg) {
    let perTeam = parseInt(util.tokenize(msg.content)[2]);
    let users = await db.getAllUsers(msg.channel.id);
    users = util.shuffle(users);
    try {
        let reply = [];
        let teamNum = 1;
        for (let i = 0; i < users.length; ++i) {
            if (i % perTeam == 0) {
                reply.push(`\nTeam ${teamNum}`);
                teamNum++;
            }
            reply.push(
                `> ${util.escapeMarkdown(users[i].username)} (${
                    users[i].platform
                })`
            );
        }
        msg.reply(reply.join("\n"));
    } catch (e) {
        msg.reply(`Failed to split teams! ${e}`);
    }
}

function getGameMode(mode) {
    let result = "";

    switch (mode) {
        case "br_brquads":
        case "mw-Br_brz_brquads":
        case "br_brz_brquads":
            result += "QUADS";
            break;
        case "br_brtrios":
        case "mw-Br_brz_brtrios":
        case "br_brz_brtrios":
            result += "TRIOS";
            break;
        case "br_brduos":
        case "mw-Br_brz_brduos":
        case "br_brz_brduos":
            result += "DUO";
            break;
        case "br_brsolo":
            result += "SOLO";
            break;
        default:
            result += "BATTLE";
            break;
    }
    return result;
}

async function startTrackStats(client) {
    setInterval(async () => {
        try {
            // Get all users tracked
            let users = await db.getAllUsersTracked();

            // If no users, do nothing
            if (users.length > 0) {
                let arrayMatchs = [];

                // For each users
                for (const user of users) {
                    console.log(`Traitement de ${user.username}`);
                    try {
                        // Get lasts matchs of user
                        let matchs = await getBattleRoyaleMatchs(
                            user.platform,
                            user.username
                        );

                        // Select the last one
                        const playerLastGame = matchs[0];
                        const matchId = playerLastGame.matchID;

                        // New date to compare if math is recent
                        let compareDate = new Date();
                        compareDate.setMinutes(
                            compareDate.getMinutes() - process.env.MAX_DURATION
                        );

                        if (
                            new Date(playerLastGame.utcEndSeconds * 1000) >=
                            compareDate
                        ) {
                            // Get last game Saved
                            const lastGame = await db.getLastMatchFromUser(
                                user.userId
                            );

                            // Si la derniere partie est enregistrée et que le matchId est le meme ignorer
                            if (!lastGame || lastGame.matchId != matchId) {
                                console.log(
                                    `La game ${matchId} de ${user.username} n'a pas été traitée`
                                );

                                // Set Last match in bdd
                                await db.addMatchFromUser(user.userId, matchId);

                                const stats = {
                                    matchId: playerLastGame.matchID,
                                    channel: user.track,
                                    top:
                                        playerLastGame.playerStats
                                            .teamPlacement,
                                    mode: getGameMode(playerLastGame.mode),
                                    matchEnded: playerLastGame.utcEndSeconds,
                                    players: [
                                        {
                                            playerName:
                                                playerLastGame.player.username,
                                            kdr:
                                                playerLastGame.playerStats
                                                    .kdRatio,
                                            kills:
                                                playerLastGame.playerStats
                                                    .kills,
                                            deaths:
                                                playerLastGame.playerStats
                                                    .deaths,
                                            headshots:
                                                playerLastGame.playerStats
                                                    .headshots,
                                            damageDealt:
                                                playerLastGame.playerStats
                                                    .damageDone,
                                            damageTaken:
                                                playerLastGame.playerStats
                                                    .damageTaken,
                                            reviver: playerLastGame.playerStats
                                                .objectiveReviver
                                                ? playerLastGame.playerStats
                                                      .objectiveReviver
                                                : 0,
                                        },
                                    ],
                                };

                                const matchIndex = arrayMatchs.findIndex(
                                    (e) => e.matchId == playerLastGame.matchID
                                );
                                console.log(matchIndex);
                                if (matchIndex >= 0) {
                                    arrayMatchs[matchIndex].players.push(
                                        stats.players[0]
                                    );
                                } else {
                                    arrayMatchs.push(stats);
                                }
                            }
                        }
                    } catch (Error) {
                        console.log(Error);
                    }
                    console.log(`Fin traitement de ${user.username}`);
                }
                sendMatchStatsTest(arrayMatchs, client);
            }
        } catch (Error) {
            //Handle Exception
            console.error(Error);
        }
    }, process.env.FIND_GAME_INTERVAL * 1000);
}
