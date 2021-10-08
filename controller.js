module.exports = { controller };

const util = require("./util");
const { setRoleAdmin } = require("./commands/admin");

const commands = {
    role_admin: {
        method: setRoleAdmin,
        syntax: "role_admin <role_id>",
        help: "Set admin role",
        rx: /^!wz role_admin <@&[0-9]{10,}>$/,
    },
};

/**
 * @param {*} client
 * @param {*} msg
 * @returns
 */
async function controller(client, msg) {
    // trim unnecessary spaces
    msg.content = msg.content.replace(/ +/g, " ").trim();

    // extract command name
    let cmd = util.tokenize(msg.content)[1];
    try {
        const command = commands[cmd];
        // check if command exists
        if (!command) {
            return;
        }
        // check if syntax is okay
        if (!command.rx.test(msg.content)) {
            msg.reply(`Invalid syntax, use \`!wz ${command.syntax}\` instead.`);
            return;
        }
        // run command
        await command.method(client, msg);
    } catch (e) {
        console.error(e);
        msg.reply(e);
    }
}
