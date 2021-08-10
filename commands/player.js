const Discord = require("discord.js");
const { generateImageStats } = require("image-warzone");

const db = require("../db");
const util = require("../util");
const { getBattleRoyaleInfo } = require("../cod-api");
const { setStatsUser } = require("../db");

/**
 * Return stats for user of message
 * @param {*} msg
 */
const statsMe = async (client, interaction) => {
    let user = await db.getUser(interaction.member.user.id);
    if (!user) {
        util.replyInteraction(client, interaction, `You are not registered.`);
    } else {
        try {
            const stats = await getBattleRoyaleInfo(
                user.platform,
                user.username
            );

            const lastStats = user.stats || null;

            let playername = user.username;
            if (playername.includes("#")) {
                playername = playername.split("#")[0];
            }

            let data = {
                pseudo: playername,
                newStats: stats,
            };

            if (
                lastStats &&
                stats.timePlayed &&
                lastStats.timePlayed !== stats.timePlayed
            ) {
                data.oldStats = {
                    ...lastStats.stats,
                    dateInsert: lastStats.dateInsert,
                };
            }

            generateImageStats(data)
                .then(async (image) => {
                    const attachment = new Discord.MessageAttachment(
                        image,
                        "stats_me.png"
                    );

                    util.replyInteraction(
                        client,
                        interaction,
                        `Stats for **${util.escapeMarkdown(user.username)}** (${
                            user.platform
                        })`
                    );

                    client.channels.cache
                        .get(interaction.channel_id)
                        .send(attachment);
                })
                .then(async () => await setStatsUser(user.userId, stats))
                .catch((e) => {
                    console.error(e);
                });
        } catch (e) {
            console.error(e);

            util.replyInteraction(
                client,
                interaction,
                `Encountered the following issue while fetching stats.`
            );
        }
    }
};

module.exports = {
    statsMe,
};
