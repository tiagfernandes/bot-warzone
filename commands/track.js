/**
 * Tracking du player
 */
const fetch = require("node-fetch");

const db = require("../db");
const util = require("../util");

const { getBattleRoyaleMatchs } = require("../cod-api");
const { sendMatchesToChannelTrack } = require("./player");
const { sendError } = require("../mailer");

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
                    .then(async (results) => {
                        // Result array of array of match
                        let matches = [];
                        await Promise.all(
                            results.map(async (result) => {
                                const { status, value, reason } = result;

                                if (status == "fulfilled") {
                                    await Promise.all(
                                        value.map(async (match) => {
                                            const stats = {
                                                matchId: match.matchID,
                                                top: match.playerStats
                                                    .teamPlacement,
                                                mode: await getGameMode(
                                                    match.mode
                                                ),
                                                matchEnded: match.utcEndSeconds,
                                                players: [
                                                    {
                                                        playerName:
                                                            match.player
                                                                .username,
                                                        kdr: match.playerStats
                                                            .kdRatio,
                                                        kills: match.playerStats
                                                            .kills,
                                                        deaths: match
                                                            .playerStats.deaths,
                                                        headshots:
                                                            match.playerStats
                                                                .headshots,
                                                        damageDealt:
                                                            match.playerStats
                                                                .damageDone,
                                                        damageTaken:
                                                            match.playerStats
                                                                .damageTaken,
                                                        reviver: match
                                                            .playerStats
                                                            .objectiveReviver
                                                            ? match.playerStats
                                                                  .objectiveReviver
                                                            : 0,
                                                    },
                                                ],
                                            };

                                            const matchIndex =
                                                matches.findIndex(
                                                    (e) =>
                                                        e.matchId ==
                                                        match.matchID
                                                );

                                            if (matchIndex >= 0) {
                                                matches[
                                                    matchIndex
                                                ].players.push(
                                                    stats.players[0]
                                                );
                                            } else {
                                                matches.push(stats);
                                            }
                                        })
                                    );
                                } else if (status == "rejected") {
                                    console.error(reason);
                                    sendError(
                                        `Error Track Match: ${reason}`
                                    );
                                }
                            })
                        );

                        console.log(
                            `Send ${matches.length} matches to ${server.channel_track_id}`
                        );

                        sendMatchesToChannelTrack(
                            client,
                            server.channel_track_id,
                            matches
                        );
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
            reject(`${player.username} : ${e}`);
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
    return new Promise((resolve) => {
        let url =
            "https://my.callofduty.com/content/atvi/callofduty/mycod/web/en/data/json/iq-content-xweb.js";

        fetch(url)
            .then((res) => res.json())
            .then((json) => {
                const gameMode = Object.keys(json)
                    .filter((key) => /^game-modes:/.exec(key))
                    .find((key) => {
                        return key.includes(mode);
                    });

                resolve(json[gameMode] ?? returnGameModeBrut(mode));
            })
            .catch(() => resolve(returnGameModeBrut(mode)));
    });
};

const returnGameModeBrut = (mode) => {
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
