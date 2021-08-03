/**
 * Récupération du profile
 */
const db = require("../db");
const util = require("../util");
const { sendUserStats } = require("../stats");

/**
 * Return stats for user of message
 * @param {*} msg
 */
const statsUser = async (msg) => {
    let user = await db.getUser(msg.author.id);
    if (!user) {
        msg.reply("You are not registered.");
    } else {
        let msgObj = await msg.reply(
            `Fetching stats for **${util.escapeMarkdown(user.username)}** (${
                user.platform
            })...`
        );
        await sendUserStats(user, 0, msgObj)();
    }
};

module.exports = {
    statsUser,
};
