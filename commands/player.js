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
 * Compare two players stats
 *
 * @param {*} client
 * @param {*} interaction
 * @param {int} playerOneId
 * @param {int} playerTwoId
 */
const comparePlayer = async (client, interaction, playerOneId, playerTwoId) => {
    let userOne = await db.getUser(playerOneId);

    if (!userOne) {
        util.replyInteraction(
            client,
            interaction,
            `<@${playerOneId}> has not registered.`
        );
    } else {
        let userTwo = await db.getUser(playerTwoId);

        if (!userTwo) {
            util.replyInteraction(
                client,
                interaction,
                `<@${playerTwoId}> has not registered.`
            );
        } else {
            try {
                client.api
                    .interactions(interaction.id, interaction.token)
                    .deferReply();

                // Stats User One
                const statsUserOne = await getBattleRoyaleInfo(
                    userOne.platform,
                    userOne.username
                );

                if (!statsUserOne) {
                    throw new Error("No stats for user one");
                }

                let playernameOne = userOne.username;
                if (playernameOne.includes("#")) {
                    playernameOne = playernameOne.split("#")[0];
                }

                // Stats User Two
                const statsUserTwo = await getBattleRoyaleInfo(
                    userTwo.platform,
                    userTwo.username
                );

                if (!statsUserTwo) {
                    throw new Error("No stats for user two");
                }

                let playernameTwo = userTwo.username;
                if (playernameTwo.includes("#")) {
                    playernameTwo = playernameTwo.split("#")[0];
                }

                let data = {
                    playerOne: statsUserOne,
                    playerTwo: statsUserTwo,
                };

                util.replyInteraction(
                    client,
                    interaction,
                    `Stats for <@${userOne.userId}> and <@${userTwo.userId}>`
                );

                console.log(data);

                /*generateImageStats(data)
                    .then(async (image) => {
                        const attachment = new Discord.MessageAttachment(
                            image,
                            "stats_me.png"
                        );

                        client.channels.cache
                            .get(interaction.channel_id)
                            .send(attachment);
                    })
                    .then(
                        async () =>
                            await setStatsUser(userOne.userId, statsUserOne)
                    )
                    .catch((e) => {
                        console.error(e);
                    });*/
            } catch (e) {
                console.error(e);

                util.replyInteraction(
                    client,
                    interaction,
                    `Encountered the following issue while fetching stats.`
                );
            }
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
    comparePlayer: comparePlayer,
};
