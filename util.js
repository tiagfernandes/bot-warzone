const DiscordJS = require("discord.js");

module.exports = {
    isValidCron: require("cron-validator").isValidCron,
    tokenize,
    keepStat,
    pprint,
    pprintStats,
    escapeMarkdown,
    parseDuration,
    shuffle,
    formatDuration,
    replyInteraction
};

const moment = require("moment");
// load moment-duration
require("moment-duration-format");

function tokenize(msg) {
    return msg.split(/ +/);
}

function keepStat(key, value) {
    // always display these stats
    if (["Match Kills", "Match Deaths", "K/D (match)"].includes(key))
        return true;
    // remove 0 value stats
    if (!value) return false;
    if (value == 0) return false;
    if (value == NaN) return false;
    if (value == "0.00") return false;
    if (value == "0s") return false;
    return true;
}

function pprint(username) {
    let msg = [`Stats for **${username}**`];

    return msg.join("\n");
}

function pprintStats(username, stats) {
    let msg = [`Stats for **${username}**`];

    // if no matches played, inform user
    if (stats["Matches"] == 0) {
        msg.push("> No matches played!");
    } else {
        // pprint the stats
        for (let stat in stats) {
            if (keepStat(stat, stats[stat])) {
                msg.push(`> ${stat}: ${stats[stat]}`);
            }
        }
    }

    return msg.join("\n");
}

/**
 *
 * @param {*} text
 * @returns
 */
function escapeMarkdown(text) {
    return text.replace(/([_*])/, "\\$1");
}

function parseDuration(d) {
    if (!d) {
        return { value: 1, unit: "day" };
    }
    let rx = /([0-9]+)([h|d|w|mo])/;
    let match = d.match(rx);
    return {
        value: match[1],
        unit: (function (x) {
            switch (x) {
                case "h":
                    return "hour";
                case "d":
                    return "day";
                case "w":
                    return "week";
                case "m":
                    return "month";
            }
        })(match[2]),
    };
}

function shuffle(arr) {
    return arr
        .map((x) => ({ key: Math.random(), val: x }))
        .sort((a, b) => a.key - b.key)
        .map((x) => x.val);
}

function formatDuration(s) {
    return moment
        .duration(s, "seconds")
        .format("w[w] d[d] h[h] m[m] s[s]", { trim: "both mid" });
}


async function replyInteraction(client, interaction, response) {
    let data = {
        content: response,
    };

    // Check for embeds
    if (typeof response === "object") {
        data = await createAPIMessage(client, interaction, response);
    }

    client.api
        .interactions(interaction.id, interaction.token)
        .callback.post({
            data: {
                type: 4,
                data,
            },
        });
};

const createAPIMessage = async (client, interaction, content) => {
    const { data, files } = await DiscordJS.APIMessage.create(
        client.channels.resolve(interaction.channel_id),
        content
    )
        .resolveData()
        .resolveFiles();

    return { ...data, files };
};