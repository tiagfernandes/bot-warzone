const DiscordJS = require("discord.js");

module.exports = {
    isValidCron: require("cron-validator").isValidCron,
    tokenize: tokenize,
    replyInteraction: replyInteraction,
    escapeMarkdown: escapeMarkdown,
};

const moment = require("moment");
// load moment-duration
require("moment-duration-format");

function tokenize(msg) {
    return msg.split(/ +/);
}

async function replyInteraction(client, interaction, response) {
    let data = {
        content: response,
    };

    // Check for embeds
    if (typeof response === "object") {
        data = await createAPIMessage(client, interaction, response);
    }

    client.api.interactions(interaction.id, interaction.token).callback.post({
        data: {
            type: 4,
            data,
        },
    });
}

/**
 *
 * @param {*} text
 * @returns
 */
function escapeMarkdown(text) {
    return text.replace(/([_])/, "$1");
}

const createAPIMessage = async (client, interaction, content) => {
    const { data, files } = await DiscordJS.APIMessage.create(
        client.channels.resolve(interaction.channel_id),
        content
    )
        .resolveData()
        .resolveFiles();

    return { ...data, files };
};
