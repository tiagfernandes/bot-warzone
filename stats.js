module.exports = {
    sendUserStats,
    sendUserMatch,
};
require("dotenv").config({ path: `.env.${process.env.NODE_ENV}` });
const Discord = require("discord.js");
const ta = require("time-ago");

const { getBattleRoyaleInfo, getPlayerProfile } = require("./cod-api");
const { addStatsFromUser, getLastStatsFromUser } = require("./db");
const { escapeMarkdown } = require("./util");

function secondsToDhm(seconds) {
    seconds = Number(seconds);
    var d = Math.floor(seconds / (3600 * 24));
    var h = Math.floor((seconds % (3600 * 24)) / 3600);
    var m = Math.floor((seconds % 3600) / 60);

    var dDisplay = d > 0 ? d + (d == 1 ? " day, " : " days, ") : "";
    var hDisplay = h > 0 ? h + (h == 1 ? " hour, " : " hours, ") : "";
    var mDisplay = m > 0 ? m + (m == 1 ? " min, " : " mins") : "";
    return dDisplay + hDisplay + mDisplay;
}

function sendUserStats(u, tryn, msgObj, err = "") {
    // timeout durations for each retry
    let tryWaits = new Array(3)
        .fill([5000, 10000, 30000, 60000, 90000])
        .flat()
        .sort((a, b) => a - b);

    // returns a function that can be passed to setTimeout
    return async function () {
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

            const embed = new Discord.MessageEmbed();
            embed
                .setTitle(`Warzone Stats ${u.username}`)
                .setThumbnail(
                    "https://modernwarfarediscordbot.com/images/gamemodes/br.png"
                )
                .setColor("PURPLE");

            await addStatsFromUser(u.userId, stats);

            if (lastStats && lastStats.stats.timePlayed !== stats.timePlayed) {
                const getSymbole = (f1, f2) => {
                    if (f1 > f2) {
                        return "▲ ";
                    } else if (f1 == f2) {
                        return "= ";
                    } else if (f1 < f2) {
                        return "▼";
                    }
                };

                const nameWithPercentage = (f1, f2, text) => {
                    return getSymbole(f1, f2) + text;
                };

                const valueInteger = (f1, f2) => {
                    if (f1 < f2) {
                        return (
                            new Intl.NumberFormat("fr-FR").format(f1) +
                            " (" +
                            ((f1 - f2) % 1 === 0) ? (f1 - f2) : (f1 - f2).toFixed(2) +
                            ")"
                        );
                    } else if (f1 == f2) {
                        return new Intl.NumberFormat("fr-FR").format(f1);
                    } else if (f1 > f2) {
                        return (
                            new Intl.NumberFormat("fr-FR").format(f1) +
                            " (+" +
                            ((f1 - f2) % 1 === 0) ? (f1 - f2) : (f1 - f2).toFixed(2) +
                            ")"
                        );
                    }
                };

                /**
                 *
                 * @param {*} f1 New Stats
                 * @param {*} f2 Previous Stats
                 */
                const valueWithPercentage = (f1, f2) => {
                    if (f1 < f2) {
                        return f1 + "% (" + (f1 - f2).toFixed(2) + "%)";
                    } else if (f1 == f2) {
                        return f1 + "%";
                    } else if (f1 > f2) {
                        return f1 + "% (+" + (f1 - f2).toFixed(2) + "%)";
                    }
                };

                embed
                    .setDescription(
                        `Battle Royale\n*Compare to : ${ta.ago(
                            lastStats.dateInsert
                        )}*`
                    )
                    .addFields(
                        {
                            name: "▲ Time Played",
                            value:
                                secondsToDhm(stats.timePlayed) +
                                " (+ " +
                                secondsToDhm(
                                    stats.timePlayed -
                                        lastStats.stats.timePlayed
                                ) +
                                ")",
                        },
                        {
                            name: "Games Played",
                            value: new Intl.NumberFormat("fr-FR").format(
                                stats.gamesPlayed
                            ),
                            inline: true,
                        },
                        {
                            name: nameWithPercentage(
                                (
                                    (stats.wins / stats.gamesPlayed) *
                                    100
                                ).toFixed(2),
                                (
                                    (lastStats.stats.wins /
                                        lastStats.stats.gamesPlayed) *
                                    100
                                ).toFixed(2),
                                "Win percentage"
                            ),
                            value: valueWithPercentage(
                                (
                                    (stats.wins / stats.gamesPlayed) *
                                    100
                                ).toFixed(2),
                                (
                                    (lastStats.stats.wins /
                                        lastStats.stats.gamesPlayed) *
                                    100
                                ).toFixed(2)
                            ),
                            inline: true,
                        },
                        {
                            name: "\u200b",
                            value: "\u200b",
                            inline: true,
                        },
                        {
                            name: nameWithPercentage(
                                stats.wins,
                                lastStats.stats.wins,
                                "Total Win"
                            ),
                            value: valueInteger(
                                stats.wins,
                                lastStats.stats.wins
                            ),
                            inline: true,
                        },
                        {
                            name: nameWithPercentage(
                                stats.topFive,
                                lastStats.stats.topFive,
                                "Top 5"
                            ),
                            value: valueInteger(
                                stats.topFive,
                                lastStats.stats.topFive
                            ),
                            inline: true,
                        },
                        {
                            name: nameWithPercentage(
                                stats.topTen,
                                lastStats.stats.topTen,
                                "Top 10"
                            ),
                            value: valueInteger(
                                stats.topTen,
                                lastStats.stats.topTen
                            ),
                            inline: true,
                        },
                        {
                            name: nameWithPercentage(
                                stats.kdRatio.toFixed(2),
                                lastStats.stats.kdRatio.toFixed(2),
                                "KDR"
                            ),
                            value: valueInteger(
                                stats.kdRatio.toFixed(2),
                                lastStats.stats.kdRatio.toFixed(2)
                            ),
                            inline: true,
                        },
                        {
                            name: nameWithPercentage(
                                stats.kills,
                                lastStats.stats.kills,
                                "Kills"
                            ),
                            value: valueInteger(
                                stats.kills,
                                lastStats.stats.kills
                            ),
                            inline: true,
                        },
                        {
                            name: nameWithPercentage(
                                stats.deaths,
                                lastStats.stats.deaths,
                                "Deaths"
                            ),
                            value: valueInteger(
                                stats.deaths,
                                lastStats.stats.deaths
                            ),
                            inline: true,
                        },
                        {
                            name: nameWithPercentage(
                                stats.downs,
                                lastStats.stats.downs,
                                "Downs"
                            ),
                            value: valueInteger(
                                stats.downs,
                                lastStats.stats.downs
                            ),
                            inline: true,
                        },
                        {
                            name: nameWithPercentage(
                                stats.revives,
                                lastStats.stats.revives,
                                "Revives"
                            ),
                            value: valueInteger(
                                stats.revives,
                                lastStats.stats.revives
                            ),
                            inline: true,
                        },
                        {
                            name: nameWithPercentage(
                                stats.revives,
                                lastStats.stats.revives,
                                "Contracts"
                            ),
                            value: valueInteger(
                                stats.contracts,
                                lastStats.stats.contracts
                            ),
                            inline: true,
                        }
                    );
            } else {
                embed.setDescription("Battle Royale").addFields(
                    {
                        name: "Time Played",
                        value: secondsToDhm(stats.timePlayed),
                    },
                    {
                        name: "Games Played",
                        value: new Intl.NumberFormat("fr-FR").format(
                            stats.gamesPlayed
                        ),
                        inline: true,
                    },
                    {
                        name: "Win percentage",
                        value:
                            ((stats.wins / stats.gamesPlayed) * 100).toFixed(
                                2
                            ) + " %",
                        inline: true,
                    },
                    {
                        name: "\u200b",
                        value: "\u200b",
                        inline: true,
                    },
                    {
                        name: "Total Wins",
                        value: new Intl.NumberFormat("fr-FR").format(
                            stats.wins
                        ),
                        inline: true,
                    },
                    {
                        name: "Top 5",
                        value: new Intl.NumberFormat("fr-FR").format(
                            stats.topFive
                        ),
                        inline: true,
                    },
                    {
                        name: "Top 10",
                        value: new Intl.NumberFormat("fr-FR").format(
                            stats.topTen
                        ),
                        inline: true,
                    },
                    {
                        name: "KDR",
                        value: stats.kdRatio.toFixed(2),
                        inline: true,
                    },
                    {
                        name: "Kills",
                        value: new Intl.NumberFormat("fr-FR").format(
                            stats.kills
                        ),
                        inline: true,
                    },
                    {
                        name: "Deaths",
                        value: new Intl.NumberFormat("fr-FR").format(
                            stats.deaths
                        ),
                        inline: true,
                    },
                    {
                        name: "Downs",
                        value: new Intl.NumberFormat("fr-FR").format(
                            stats.downs
                        ),
                        inline: true,
                    },
                    {
                        name: "Revives",
                        value: new Intl.NumberFormat("fr-FR").format(
                            stats.revives
                        ),
                        inline: true,
                    },
                    {
                        name: "Contracts",
                        value: new Intl.NumberFormat("fr-FR").format(
                            stats.contracts
                        ),
                        inline: true,
                    }
                );
            }

            // edit original message
            await msgObj.edit({ embed: embed });
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
}

function displayTop(top) {
    if (top == 1) {
        return "1 🥇️";
    } else if (top == 2) {
        return "2 🥈️";
    } else if (top == 3) {
        return "3 🥉️";
    } else {
        return top;
    }
}

function unixTime(unixtime) {
    var u = new Date(unixtime * 1000);
    return (
        ("0" + u.getUTCDate()).slice(-2) +
        "/" +
        ("0" + u.getUTCMonth() + 1).slice(-2) +
        "/" +
        u.getUTCFullYear() +
        " " +
        ("0" + u.getUTCHours()).slice(-2) +
        ":" +
        ("0" + u.getUTCMinutes()).slice(-2) +
        ":" +
        ("0" + u.getUTCSeconds()).slice(-2)
    );
}

function getGameMode(mode) {
    let result = "Battle Royal ";
    switch (mode) {
        case "br_brquads":
            result += "Quads";
            break;
        case "br_brtrios":
            result += "Trio";
            break;
        case "br_brduos":
            result += "Duo";
            break;
        default:
            result += "Solo";
            break;
    }
    return result;
}

async function sendUserMatch(u, match, msgObj) {
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
                    name: "\u200b",
                    value: "\u200b",
                    inline: true,
                }
            );
        await msgObj.edit({ embed: embed });

        if (match.playerStats.teamPlacement == 1) {
            await msgObj.channel.send(
                "https://tenor.com/view/the-great-gatsby-leonardo-di-caprio-cheers-drink-drinking-gif-4180840"
            );
        }
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
