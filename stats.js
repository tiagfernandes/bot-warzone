const Discord = require("discord.js");

const { generateImageMatch, generateImageStats } = require("image-warzone");

const { getBattleRoyaleInfo } = require("./cod-api");
const { addStatsFromUser, getLastStatsFromUser } = require("./db");
const { escapeMarkdown } = require("./util");

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

const sendMatchStats = async (matchs, client) => {
    matchs.forEach((match) => {
        generateImageMatch(match).then((image) => {
            const sfattach = new Discord.MessageAttachment(image, "stats.png");

            client.channels.cache.get(match.channel).send(sfattach);
        });
    });
};


module.exports = {
    sendUserStats,
    sendMatchStats
}