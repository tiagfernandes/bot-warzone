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
 * @param {*} msg
 */
const registerUser = async (msg) => {
    let tokens = util.tokenize(msg.content);
    let username = tokens[3];
    let platform = tokens[2];

    let user = await db.getUserFromChannel(msg.channel.id, username, platform);

    if (user) {
        msg.reply(`**${username}** (${platform}) already exist!`);
    } else {
        let player = await getPlayerProfile(platform, username);
        if (player) {
            await db.addUserToChannel(
                msg.channel.id,
                player.username,
                player.platform
            );
            await db.addUser(msg.author.id, player.username, player.platform);

            msg.reply(
                `**${player.username}** (${player.platform}) has been registered!`
            );
        } else {
            msg.reply(
                `**${username}** (${platform}) does not exist or private (see https://my.callofduty.com/fr/dashboard)!`
            );
        }
    }
};

/**
 * Unregister a user
 */
const unregisterUser = async (msg) => {
    let tokens = util.tokenize(msg.content);
    let username = tokens[3];
    let platform = tokens[2];

    let player = await db.getUserFromChannel(
        msg.channel.id,
        username,
        platform
    );

    if (player) {
        await db.removeUserFromChannel(
            msg.channel.id,
            player.username,
            player.platform
        );
        msg.reply(
            `**${util.escapeMarkdown(player.username)}** (${
                player.platform
            }) has been unregistered!`
        );
    } else {
        msg.reply(
            `**${util.escapeMarkdown(
                username
            )}** (${platform}) has not been registered!`
        );
    }
};

module.exports = {
    registrants,
    registerUser,
    unregisterUser,
};
