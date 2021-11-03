/**
 * Tracking du player
 */
const db = require("../db");
const util = require("../util");

const { getBattleRoyaleMatchs } = require("../cod-api");
const { sendMatchesToChannelTrack } = require("./player");

/**
 * Set a channel track for server
 *
 * @param {*} client
 * @param {*} interaction
 * @param {*} args
 */
const setChannelTrack = async (client, interaction, args) => {
    const { channel } = args;

    await db.setChannelTrack(interaction.guild_id, channel);

    util.replyInteraction(client, interaction, `Channel track saved`);
};

/**
 * @param {*} client
 */
const getMatchTracked = (client) => {
    // Get servers
    db.getServersWithChannelTrack().then((servers) => {
        // For each server
        servers.forEach((server) => {
            // Get users tracked from server
            db.getAllUsersTrackedFromServer(server.serverId).then((users) => {
                // Promise.all()
                const promises = users.map((u) => getMatchesNotTracked(u));

                Promise.allSettled(promises)
                    .then((results) => {
                        // Result array of array of match
                        let matches = [];
                        results.forEach((result) => {
                            const { status, value, reason } = result;

                            if (status == "fulfilled") {
                                value.forEach((match) => {
                                    const stats = {
                                        matchId: match.matchID,
                                        top: match.playerStats.teamPlacement,
                                        mode: getGameMode(match.mode),
                                        matchEnded: match.utcEndSeconds,
                                        players: [
                                            {
                                                playerName:
                                                    match.player.username,
                                                kdr: match.playerStats.kdRatio,
                                                kills: match.playerStats.kills,
                                                deaths: match.playerStats
                                                    .deaths,
                                                headshots:
                                                    match.playerStats.headshots,
                                                damageDealt:
                                                    match.playerStats
                                                        .damageDone,
                                                damageTaken:
                                                    match.playerStats
                                                        .damageTaken,
                                                reviver: match.playerStats
                                                    .objectiveReviver
                                                    ? match.playerStats
                                                          .objectiveReviver
                                                    : 0,
                                            },
                                        ],
                                    };

                                    const matchIndex = matches.findIndex(
                                        (e) => e.matchId == match.matchID
                                    );

                                    if (matchIndex >= 0) {
                                        matches[matchIndex].players.push(
                                            stats.players[0]
                                        );
                                    } else {
                                        matches.push(stats);
                                    }
                                });

                                sendMatchesToChannelTrack(
                                    client,
                                    server.channel_track_id,
                                    matches
                                );
                            } else if (status == "rejected") {
                                console.error(reason);
                            }
                        });
                    })
                    .catch(console.error);
            });
        });
    });
};

function getMatchesNotTracked(player) {
    return new Promise(async (resolve, reject) => {
        try {
            console.log(
                `Traitement de ${player.username} (${player.platform})`
            );
            // If has old matches, else empty array
            const oldMatches = player.matches || [];
            // Get last 20 matches
            const newMatches = await getBattleRoyaleMatchs(
                player.platform,
                player.username
            );

            let matches = [];
            if (newMatches.length > 0) {
                // Trie des plus vieux avant
                newMatches.sort((a, b) => {
                    return a.utcEndSeconds - b.utcEndSeconds;
                });

                newMatches.forEach((newMatch) => {
                    if (newMatch.utcEndSeconds > player.trackedAt) {
                        const found = oldMatches.find(
                            (oldMatch) => oldMatch.matchID == newMatch.matchID
                        );

                        if (found == undefined) {
                            matches = [...matches, newMatch];
                        }
                    }
                });

                // Update player.matches = newMatches;
                db.setMatchesToPlayer(player.userId, newMatches);
            }

            console.log(
                `Fin de traitement de ${player.username} (${player.platform}) avec ${matches.length} matches`
            );
            resolve(matches);
        } catch (e) {
            console.log(`Error ${player.username} : ${e}`);
            reject(e);
        }
    });
}

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

module.exports = {
    track: track,
    untrack: untrack,
    setChannelTrack: setChannelTrack,
    getMatchTracked: getMatchTracked,
};
