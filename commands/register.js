/**
 * Enregistrement / Modification / Suppression de l'enregistrement
 */
const db = require("../db");
const util = require("../util");
const { getPlayerProfile } = require("../cod-api");

/**
 * Send list of all registered users
 *
 * @param {*} msg
 */
const registrants = async (msg) => {
    let users = await db.getAllUsers(msg.channel.id);
    if (users.length > 0) {
        users = users.map(
            (x) => `${util.escapeMarkdown(x.username)} (${x.platform})`
        );
        msg.reply(`\nRegistered users:\n${users.join("\n")}`);
    } else {
        msg.reply("No users have been registered.");
    }
};

/**
 * Register a user
 *
 * @param {*} client
 * @param {*} interaction
 * @param {*} args
 */
const registerUser = async (client, interaction, args) => {
    const { platform, username } = args;

    let user = await db.getUserFromServer(
        interaction.guild_id,
        username,
        platform
    );

    if (user) {
        util.replyInteraction(
            client,
            interaction,
            `**${username}** (${platform}) already exist!`
        );
    } else {
        let player = await getPlayerProfile(platform, username);
        
        if (player) {
            db.addPlayer(interaction, player.username, player.platform)
                .then(() => {
                    util.replyInteraction(
                        client,
                        interaction,
                        `**${player.username}** (${player.platform}) has been registered!`
                    );
                })
                .catch((err) => {
                    console.error(err);

                    util.replyInteraction(
                        client,
                        interaction,
                        `**${player.username}** (${player.platform}) already registered!`
                    );
                });
        } else {
            util.replyInteraction(
                client,
                interaction,
                `**${username}** (${platform}) does not exist or private (see https://my.callofduty.com/fr/dashboard )!`
            );
        }
    }
};

/**
 * Unregister a user
 */
 const unregisterUser = async (client, interaction) => {
    let user = await db.getUser(interaction.member.user.id);

    if (user) {
        // Remove user
        await db.removeUser(user._id);
        util.replyInteraction(
            client,
            interaction,
            `You has been unregistered!`
        );
    } else {
        util.replyInteraction(client, interaction, `You has not registed!`);
    }
};

/**
 * @param {*} client
 * @param {*} interaction
 * @param {*} args
 */
const changeUser = async (client, interaction, args) => {
    const { platform, username } = args;

    let user = await db.getUser(interaction.member.user.id);

    if (user) {
        let player = await getPlayerProfile(platform, username);

        if (player) {
            await db
                .modifyPlayer(interaction, player.username, player.platform)
                .then(() => {
                    util.replyInteraction(
                        client,
                        interaction,
                        `**${player.username}** (${player.platform}) has been updated!`
                    );
                })
                .catch((err) => {
                    console.error(err);

                    util.replyInteraction(
                        client,
                        interaction,
                        `**${player.username}** (${player.platform}) already registered!`
                    );
                });
        } else {
            util.replyInteraction(
                client,
                interaction,
                `**${username}** (${platform}) does not exist or private (see https://my.callofduty.com/fr/dashboard )!`
            );
        }
    } else {
        util.replyInteraction(client, interaction, `You has not registed!`);
    }
};

module.exports = {
    registrants,
    registerUser: registerUser,
    changeUser: changeUser,
    unregisterUser: unregisterUser,
};
