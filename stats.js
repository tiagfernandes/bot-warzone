require("dotenv").config({ path: `.env.${process.env.NODE_ENV}` });
const table = require("markdown-table");

const { generateImageMatch, generateImageStats } = require("image-warzone");

const Discord = require("discord.js");

const { getBattleRoyaleInfo } = require("./cod-api");
const { addStatsFromUser, getLastStatsFromUser } = require("./db");
const { escapeMarkdown } = require("./util");

const secondsToDhm = (seconds) => {
    seconds = Number(seconds);
    var d = Math.floor(seconds / (3600 * 24));
    var h = Math.floor((seconds % (3600 * 24)) / 3600);
    var m = Math.floor((seconds % 3600) / 60);

    var dDisplay = d > 0 ? d + (d == 1 ? " day, " : " days, ") : "";
    var hDisplay = h > 0 ? h + (h == 1 ? " hour, " : " hours, ") : "";
    var mDisplay = m > 0 ? m + (m == 1 ? " min, " : " mins") : "";
    return dDisplay + hDisplay + mDisplay;
};

const sendUserStats = (u, tryn, msgObj, err = "") => {
    // timeout durations for each retry
    let tryWaits = new Array(3)
        .fill([5000, 10000, 30000, 60000, 90000])
        .flat()
        .sort((a, b) => a - b);

    // returns a function that can be passed to setTimeout
    return async () => {
        // if retried max times, just stop
        if (tryn >= tryWaits.length) {
            await msgObj.edit(
                `Failed to fetch stats for **${escapeMarkdown(u.username)}** (${
                    u.platform
                }):\n> ${err.msg}`
            );
            return;
        }
        try {
            const stats = await getBattleRoyaleInfo(u.platform, u.username);

            const lastStats = await getLastStatsFromUser(u.userId);

            let playername = u.username;
            if (playername.includes("#")) {
                playername = playername.split("#")[0];
            }

            let data = {
                pseudo: playername,
                newStats: stats,
            };

            if (
                lastStats &&
                lastStats.stats &&
                stats.timePlayed &&
                lastStats.stats.timePlayed !== stats.timePlayed
            ) {
                data.oldStats = {
                    ...lastStats.stats,
                    dateInsert: lastStats.dateInsert,
                };
            }

            generateImageStats(data)
                .then(async (image) => {
                    const sfattach = new Discord.MessageAttachment(
                        image,
                        "stats.png"
                    );

                    // client.channels.cache.get(match.channel).send(sfattach);

                    // edit original message
                    await msgObj.reply(sfattach);
                })
                .then(async () => await addStatsFromUser(u.userId, stats));
        } catch (e) {
            console.log(e);
            // an issue with the API, configure a retry and notify the user
            let errMsg =
                `Encountered the following issue while fetching stats ` +
                `for **${escapeMarkdown(u.username)}** (${u.platform}).\n> ${
                    e.msg
                }\n *Retry ${tryn + 1}/${tryWaits.length}*.`;

            if (e.code == "WzMatchService::NoAccount") {
                //truncate the retry part and the /n
                errMsg = errMsg.slice(0, errMsg.indexOf("*Retry") - 1);
            } else {
                // schedule retry
                setTimeout(
                    sendUserStats(u, tryn + 1, msgObj, e),
                    tryWaits[tryn]
                );
            }
            // edit message with error
            await msgObj.edit(errMsg);
        }
    };
};

const displayTop = (top) => {
    if (top == 1) {
        return "1 🥇️";
    } else if (top == 2) {
        return "2 🥈️";
    } else if (top == 3) {
        return "3 🥉️";
    } else {
        return top;
    }
};

const unixTime = (unixtime) => {
    var d = new Date(unixtime * 1000);
    return d.toLocaleString("fr-FR");
};

const getGameMode = (mode) => {
    let result = "Battle Royal";

    switch (mode) {
        case "br_brquads":
        case "mw-Br_brz_brquads":
            result += " Quads";
            break;
        case "br_brtrios":
        case "mw-Br_brz_brtrios":
            result += " Trio";
            break;
        case "br_brduos":
        case "mw-Br_brz_brduos":
            result += " Duo";
            break;
        case "br_brsolo":
            result += " Solo";
            break;
        case "br_dmz_plnbld":
            result += " Pillage";
            break;
        default:
            result += "";
            break;
    }
    return result;
};

const sendUserMatch = async (u, match, msgObj) => {
    if (match.mode != "br_dmz_plnbld") {
        try {
            const embed = new Discord.MessageEmbed();
            embed
                .setAuthor(`Warzone Match`)
                .setTitle(
                    `${u.username}'s team finished ${match.playerStats.teamPlacement} against ${match.teamCount} teams`
                )
                .setThumbnail(
                    "https://modernwarfarediscordbot.com/images/gamemodes/br.png"
                )
                .setColor("#FFFF00")
                .setDescription(
                    `**Gamemode**: ${getGameMode(match.mode)}
                **Match ended at**: ${unixTime(match.utcEndSeconds)}`
                )
                .addFields(
                    {
                        name: "Top",
                        value: displayTop(match.playerStats.teamPlacement),
                        inline: true,
                    },
                    {
                        name: "Match Duration",
                        value: secondsToDhm(match.playerStats.timePlayed),
                        inline: true,
                    },
                    {
                        name: "Team survived for",
                        value: secondsToDhm(
                            match.playerStats.teamSurvivalTime / 1000
                        ),
                        inline: true,
                    },
                    {
                        name: "KDR",
                        value: match.playerStats.kdRatio.toFixed(2),
                        inline: true,
                    },
                    {
                        name: "Kills",
                        value: match.playerStats.kills,
                        inline: true,
                    },
                    {
                        name: "Deaths",
                        value: match.playerStats.deaths,
                        inline: true,
                    },
                    {
                        name: "Damage dealt",
                        value: new Intl.NumberFormat("fr-FR").format(
                            match.playerStats.damageDone
                        ),
                        inline: true,
                    },
                    {
                        name: "Damage taken",
                        value: new Intl.NumberFormat("fr-FR").format(
                            match.playerStats.damageTaken
                        ),
                        inline: true,
                    },
                    {
                        name: "Headshots",
                        value: new Intl.NumberFormat("fr-FR").format(
                            match.playerStats.headshots
                        ),
                        inline: true,
                    },
                    {
                        name: "Assists",
                        value: new Intl.NumberFormat("fr-FR").format(
                            match.playerStats.assists
                        ),
                        inline: true,
                    },
                    {
                        name: "Team Wiped",
                        value: match.playerStats.objectiveTeamWiped
                            ? new Intl.NumberFormat("fr-FR").format(
                                  match.playerStats.objectiveTeamWiped
                              )
                            : 0,
                        inline: true,
                    },
                    {
                        name: "Reviver",
                        value: match.playerStats.objectiveReviver
                            ? new Intl.NumberFormat("fr-FR").format(
                                  match.playerStats.objectiveReviver
                              )
                            : 0,
                        inline: true,
                    }
                );
            await msgObj.edit({ embed: embed });
        } catch (e) {
            // an issue with the API, configure a retry and notify the user
            let errMsg =
                `Encountered the following issue while fetching match ` +
                `for **${escapeMarkdown(u.username)}** (${u.platform}).\n> ${
                    e.message
                }`;

            await msgObj.edit(errMsg);
        }
    }
};

const sendMatchStats = async (matchs, client) => {
    for (const matchId in matchs) {
        const channel = client.channels.cache.get(
            matchs[matchId][0].user.track
        );

        if (matchs[matchId][0].playerLastGame.mode != "br_dmz_plnbld") {
            if (matchs[matchId].length > 1) {
                let arrayTable = [
                    [""],
                    ["KDR"],
                    ["Kills"],
                    ["Deaths"],
                    ["Damage dealt"],
                    ["Damage taken"],
                    ["Headshots"],
                    ["Assists"],
                    ["Team Wiped"],
                    ["Reviver"],
                ];

                let arrayAlign = ["l"];

                let message = `
> **Warzone Match**
Team finished **${displayTop(
                    matchs[matchId][0].playerLastGame.playerStats.teamPlacement
                )}** against ${
                    matchs[matchId][0].playerLastGame.teamCount
                } teams
*Gamemode: ${getGameMode(matchs[matchId][0].playerLastGame.mode)}*
*Match ended at: ${unixTime(matchs[matchId][0].playerLastGame.utcEndSeconds)}*
`;
                matchs[matchId].forEach((match) => {
                    console.log(matchs.playerLastGame);

                    arrayTable[0] = [...arrayTable[0], match.user.username];
                    arrayTable[1] = [
                        ...arrayTable[1],
                        match.playerLastGame.playerStats.kdRatio.toFixed(2),
                    ];
                    arrayTable[2] = [
                        ...arrayTable[2],
                        match.playerLastGame.playerStats.kills,
                    ];
                    arrayTable[3] = [
                        ...arrayTable[3],
                        match.playerLastGame.playerStats.deaths,
                    ];
                    arrayTable[4] = [
                        ...arrayTable[4],
                        new Intl.NumberFormat("fr-FR").format(
                            match.playerLastGame.playerStats.damageDone
                        ),
                    ];
                    arrayTable[5] = [
                        ...arrayTable[5],
                        new Intl.NumberFormat("fr-FR").format(
                            match.playerLastGame.playerStats.damageTaken
                        ),
                    ];
                    arrayTable[6] = [
                        ...arrayTable[6],
                        match.playerLastGame.playerStats.headshots,
                    ];
                    arrayTable[7] = [
                        ...arrayTable[7],
                        match.playerLastGame.playerStats.assists,
                    ];
                    arrayTable[8] = [
                        ...arrayTable[8],
                        match.playerLastGame.playerStats.objectiveTeamWiped
                            ? new Intl.NumberFormat("fr-FR").format(
                                  match.playerLastGame.playerStats
                                      .objectiveTeamWiped
                              )
                            : 0,
                    ];
                    arrayTable[9] = [
                        ...arrayTable[9],
                        match.playerLastGame.playerStats.objectiveReviver
                            ? new Intl.NumberFormat("fr-FR").format(
                                  match.playerLastGame.playerStats
                                      .objectiveReviver
                              )
                            : 0,
                    ];

                    arrayAlign = [...arrayAlign, "r"];
                });

                message += `\`\`\`${table(arrayTable, {
                    align: arrayAlign,
                })}\`\`\``;

                await channel.send(message);
            } else {
                const embed = new Discord.MessageEmbed();
                embed
                    .setAuthor(`Warzone Match`)
                    .setTitle(
                        `${matchs[matchId][0].user.username}'s team finished ${matchs[matchId][0].playerLastGame.playerStats.teamPlacement} against ${matchs[matchId][0].playerLastGame.teamCount} teams`
                    )
                    .setThumbnail(
                        "https://modernwarfarediscordbot.com/images/gamemodes/br.png"
                    )
                    .setColor("#FFFF00")
                    .setDescription(
                        `**Gamemode**: ${getGameMode(
                            matchs[matchId][0].playerLastGame.mode
                        )}
                **Match ended at**: ${unixTime(
                    matchs[matchId][0].playerLastGame.utcEndSeconds
                )}`
                    )
                    .addFields(
                        {
                            name: "Top",
                            value: displayTop(
                                matchs[matchId][0].playerLastGame.playerStats
                                    .teamPlacement
                            ),
                            inline: true,
                        },
                        {
                            name: "Match Duration",
                            value: secondsToDhm(
                                matchs[matchId][0].playerLastGame.playerStats
                                    .timePlayed
                            ),
                            inline: true,
                        },
                        {
                            name: "Team survived for",
                            value: secondsToDhm(
                                matchs[matchId][0].playerLastGame.playerStats
                                    .teamSurvivalTime / 1000
                            ),
                            inline: true,
                        },
                        {
                            name: "KDR",
                            value: matchs[
                                matchId
                            ][0].playerLastGame.playerStats.kdRatio.toFixed(2),
                            inline: true,
                        },
                        {
                            name: "Kills",
                            value: matchs[matchId][0].playerLastGame.playerStats
                                .kills,
                            inline: true,
                        },
                        {
                            name: "Deaths",
                            value: matchs[matchId][0].playerLastGame.playerStats
                                .deaths,
                            inline: true,
                        },
                        {
                            name: "Damage dealt",
                            value: new Intl.NumberFormat("fr-FR").format(
                                matchs[matchId][0].playerLastGame.playerStats
                                    .damageDone
                            ),
                            inline: true,
                        },
                        {
                            name: "Damage taken",
                            value: new Intl.NumberFormat("fr-FR").format(
                                matchs[matchId][0].playerLastGame.playerStats
                                    .damageTaken
                            ),
                            inline: true,
                        },
                        {
                            name: "Headshots",
                            value: new Intl.NumberFormat("fr-FR").format(
                                matchs[matchId][0].playerLastGame.playerStats
                                    .headshots
                            ),
                            inline: true,
                        },
                        {
                            name: "Assists",
                            value: new Intl.NumberFormat("fr-FR").format(
                                matchs[matchId][0].playerLastGame.playerStats
                                    .assists
                            ),
                            inline: true,
                        },
                        {
                            name: "Team Wiped",
                            value: matchs[matchId][0].playerLastGame.playerStats
                                .objectiveTeamWiped
                                ? new Intl.NumberFormat("fr-FR").format(
                                      matchs[matchId][0].playerLastGame
                                          .playerStats.objectiveTeamWiped
                                  )
                                : 0,
                            inline: true,
                        },
                        {
                            name: "Reviver",
                            value: matchs[matchId][0].playerLastGame.playerStats
                                .objectiveReviver
                                ? new Intl.NumberFormat("fr-FR").format(
                                      matchs[matchId][0].playerLastGame
                                          .playerStats.objectiveReviver
                                  )
                                : 0,
                            inline: true,
                        }
                    );
                await channel.send({ embed });
            }
        }
    }
};

const sendMatchStatsTest = async (matchs, client) => {
    matchs.forEach((match) => {
        generateImageMatch(match).then((image) => {
            const sfattach = new Discord.MessageAttachment(image, "stats.png");

            client.channels.cache.get(match.channel).send(sfattach);
        });
    });
};


module.exports = {
    sendUserStats,
    sendUserMatch,
    sendMatchStats,
    sendMatchStatsTest
}