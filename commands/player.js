const Discord = require("discord.js");
const { generateImageStats, generateImageMatch } = require("image-warzone");

const db = require("../db");
const util = require("../util");
const { getBattleRoyaleInfo } = require("../cod-api");
const { setStatsUser } = require("../db");

/**
 * Return stats for user of message
 *
 * @param {*} client
 * @param {*} interaction
 * @param {integer|null} playerId
 */
const stats = async (client, interaction, playerId = null) => {
    let user = await db.getUser(
        playerId ? playerId : interaction.member.user.id
    );

    if (!user) {
        util.replyInteraction(
            client,
            interaction,
            playerId
                ? `This player has not registered.`
                : `You are not registered.`
        );
    } else {
        try {
            client.api
                .interactions(interaction.id, interaction.token)
                .deferReply();

            const stats = await getBattleRoyaleInfo(
                user.platform,
                user.username
            );

            if (!stats) {
                throw new Error("No stats");
            }

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
                    ...lastStats,
                    dateInsert: user.statsDateInsert,
                };
            }
            
            
            util.replyInteraction(
                client,
                interaction,
                `Stats for **${util.escapeMarkdown(user.username)}**`
            );

            generateImageStats(data)
                .then(async (image) => {
                    const attachment = new Discord.MessageAttachment(
                        image,
                        "stats_me.png"
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

/**
 * @param {*} client
 * @param {*} channelTrack
 * @param {array} matches
 */
const sendMatchesToChannelTrack = (client, channelTrack, matches) => {
    matches.forEach((match) => {
        generateImageMatch(match).then((image) => {
            const attachment = new Discord.MessageAttachment(
                image,
                `match-${match.matchId}.png`
            );

            client.channels.cache.get(channelTrack).send(attachment);
        });
    });
};

module.exports = {
    stats: stats,
    sendMatchesToChannelTrack: sendMatchesToChannelTrack,
};
