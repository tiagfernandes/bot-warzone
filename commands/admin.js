const util = require("../util");
const db = require("../db");
const { initSlashCommands } = require("../slash-commands");

const REACTION_ACCEPT = "🔫";
const MESSAGE_INFO = `***Règles des salons WARZONE:***
Les salons servent uniquement pour les stats de Call-Of-Duty Warzone.
Le salon Warzone-Stats, vous permet d'afficher vos stats et celles de vos amis.
Le salon Warzone-track affichera uniquement les matches joués, si vous êtes *tracké*. Pour être tracké, utilisé la commande \`/track\`.

En acceptant les règles, vous aurez accès aux salons.
**Pour accepter**, clique sur ${REACTION_ACCEPT}`;

/**
 * Set role admin
 *
 * @param {*} client
 * @param {*} msg
 */
async function setRoleAdmin(client, msg) {
    let tokens = util.tokenize(msg.content);
    let roleAdminId = /<@&([0-9]{10,})>/.exec(tokens[2])[1];

    try {
        const server = await db.getServerById(msg.guild.id);

        if (
            server &&
            server.role_admin_id &&
            !msg.member.roles.cache.has(server.role_admin_id)
        ) {
            throw new Error(`You are not an Admin`);
        }

        await db.setRoleAdminId(msg.guild.id, roleAdminId);

        msg.reply(`\nRole Admin save: <@&${roleAdminId}>`);

        initSlashCommands(client, msg.guild.id, roleAdminId);
    } catch (err) {
        console.error(err);
        msg.reply(`\n${err.message}`);
    }
}

/**
 * Refresh slash commands from server
 * Case new commands available
 *
 * @param {*} client
 * @param {*} interaction
 */
async function refreshSlashCommands(client, interaction) {
    const server = await db.getServerById(interaction.guild_id);

    initSlashCommands(client, interaction.guild_id, server.role_admin_id);

    util.replyInteraction(client, interaction, `Request had been noted`);
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
    refreshSlashCommands: refreshSlashCommands,
    REACTION_ACCEPT: REACTION_ACCEPT,
};
