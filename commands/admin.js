const util = require("../util");
const db = require("../db");
const { initSlashCommands } = require("../slash-commands");

const REACTION_ACCEPT = "🔫";
const MESSAGE_INFO = `Pour accepté les règles, clique sur ${REACTION_ACCEPT}`;

/**
 * Set role admin
 *
 * @param {*} client
 * @param {*} msg
 */
async function setRoleAdmin(client, msg) {
    let tokens = util.tokenize(msg.content);
    let roleAdminId = /<@&([0-9]{10,})>/.exec(tokens[2])[1];

    await db.setRoleAdminId(msg.guild.id, roleAdminId);

    msg.reply(`\nRole Admin save: <@&${roleAdminId}>`);

    initSlashCommands(client, msg.guild.id, roleAdminId);
}

/**
 * Set role player
 * Only for admin role
 *
 * @param {*} client
 * @param {*} interaction
 * @param {*} args
 */
async function setRolePlayer(client, interaction, args) {
    const { role } = args;

    console.log(role);

    db.setRolePlayerId(interaction.guild_id, role).then(() => {
        util.replyInteraction(
            client,
            interaction,
            `Role Player save: <@&${role}>`
        );
    });
}

/**
 * Set channel info
 * Only for admin role
 *
 * @param {*} client
 * @param {*} interaction
 * @param {*} args
 */
async function setChannelInfo(client, interaction, args) {
    const { channel } = args;

    const guildId = interaction.guild_id;

    // Add channel info in bdd
    await db.setChannelInfo(guildId, channel);

    util.replyInteraction(
        client,
        interaction,
        `Channel Info save to: <#${channel}>`
    );

    const server = await db.getServerById(guildId);

    client.guilds.cache
        .get(guildId)
        .channels.cache.get(channel)
        .messages.fetch(server.message_info_id)
        .then((message) => {
            message.edit(MESSAGE_INFO);
        })
        .catch(() => {
            // If not exit add message
            client.guilds.cache
                .get(guildId)
                .channels.cache.get(channel)
                .send(MESSAGE_INFO)
                .then(async (message) => {
                    message.react(REACTION_ACCEPT);

                    await db.setMessageInfo(guildId, message.id);
                });
        });
}

module.exports = {
    setRolePlayer: setRolePlayer,
    setChannelInfo: setChannelInfo,
    setRoleAdmin: setRoleAdmin,
    REACTION_ACCEPT: REACTION_ACCEPT,
};
