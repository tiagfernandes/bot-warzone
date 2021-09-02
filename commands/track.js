/**
 * Tracking du player
 */
const db = require("../db");
const util = require("../util");

const { getBattleRoyaleMatchs } = require("../cod-api");
const { sendMatchStats } = require("../stats");

/**
 * Set a channel track for server
 * @param {*} client
 * @param {*} interaction
 * @param {*} args
 */
const setChannelTrack = async (client, interaction, args) => {
    const { channel } = args;

    await db.setChannelTrack(interaction.guild_id, channel);

    util.replyInteraction(client, interaction, `Channel track saved`);
};

const getMatchTracked = () => {
    // récupe des serveurs où channel_track
    // for each
    //      recup user tracked
    //      Promise All get lasts match

    db.getAllServersWithChannelTrack().then((servers) => {
        servers.forEach((server) => {
            db.getAllUsersTrackedFromServer(server.serverId).then((users) => {
                users.forEach(console.log);
            });
        });
    });
};

/**
 * Track a player
 */
const track = async (client, interaction) => {
    let user = await db.getUser(interaction.member.user.id);

    if (user) {
        db.trackUser(user.userId);
        util.replyInteraction(client, interaction, `You are tracked!`);
    } else {
        util.replyInteraction(client, interaction, `You has not registed!`);
    }
};

/**
 * Untrack a player
 */
const untrack = async (client, interaction) => {
    let user = await db.getUser(interaction.member.user.id);

    if (user) {
        db.untrackUser(user.userId);
        util.replyInteraction(client, interaction, `You are untracked!`);
    } else {
        util.replyInteraction(client, interaction, `You has not registed!`);
    }
};

const getGameMode = (mode) => {
    let result = "";

    switch (mode) {
        case "br_brquads":
        case "mw-Br_brz_brquads":
        case "br_brz_brquads":
            result += "QUAD";
            break;
        case "br_brtrios":
        case "mw-Br_brz_brtrios":
        case "br_brz_brtrios":
            result += "TRIO";
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
};

//TODO a check pour le lancer en cron
const startTrackStats = async (client) => {
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
                                    top: playerLastGame.playerStats
                                        .teamPlacement,
                                    mode: getGameMode(playerLastGame.mode),
                                    matchEnded: playerLastGame.utcEndSeconds,
                                    players: [
                                        {
                                            playerName:
                                                playerLastGame.player.username,
                                            kdr: playerLastGame.playerStats
                                                .kdRatio,
                                            kills: playerLastGame.playerStats
                                                .kills,
                                            deaths: playerLastGame.playerStats
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
                sendMatchStats(arrayMatchs, client);
            }
        } catch (Error) {
            //Handle Exception
            console.error(Error);
        }
    }, process.env.FIND_GAME_INTERVAL * 1000);
};

module.exports = {
    track,
    untrack,
    startTrackStats,
    setChannelTrack: setChannelTrack,
    getMatchTracked: getMatchTracked,
};
