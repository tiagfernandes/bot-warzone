// ADMIN
const ADMIN_ROLE_PLAYER = "role-player";
const ADMIN_CHANNEL_INFO = "channel-info";
const ADMIN_CHANNEL_TRACK = "channel-track";
// !ADMIN

// PLAYER
const PLAYER_STATS = "stats";
const PLAYER_STATS_ME = "me";
const PLAYER_STATS_PLAYER = "player";
// !PLAYER

// REGISTER
const REGISTER_REGISTER = "register";
const REGISTER_UNREGISTER = "unregister";
const REGISTER_CHANGE_PLAYER = "change-player";
// !REGISTER

// TRACK
const TRACK_TRACK = "track";
const TRACK_UNTRACK = "untrack";
// !TRACK

/**
 * @param {*} client
 * @param {*} guildId
 */
const getApp = (client, guildId = null) => {
    const app = client.api.applications(client.user.id);
    if (guildId) {
        app.guilds(guildId);
    }
    return app;
};

/**
 * @param {*} client
 * @param {*} guildId
 * @param {*} roleAdminId
 */
const initSlashCommands = async (client, guildId, roleAdminId) => {
    // ADMIN
    console.log("Command ADMIN " + ADMIN_ROLE_PLAYER);
    getApp(client, guildId)
        .commands.post({
            data: {
                name: ADMIN_ROLE_PLAYER,
                description: "Set role player",
                default_permission: false,
                options: [
                    {
                        name: "role",
                        description: "Role",
                        type: 8,
                        required: true,
                    },
                ],
            },
        })
        .then(({ id }) => {
            getApp(client, guildId)
                .commands(id)
                .permissions.put({
                    data: {
                        permissions: [
                            {
                                id: roleAdminId,
                                type: 1,
                                permission: true,
                            },
                        ],
                    },
                })
                .then(() => {
                    console.log("Command ADMIN " + ADMIN_ROLE_PLAYER + " DONE");
                });
        });

    console.log("Command ADMIN " + ADMIN_CHANNEL_INFO);
    getApp(client, guildId)
        .commands.post({
            data: {
                name: ADMIN_CHANNEL_INFO,
                description: "Set channel-info",
                default_permission: false,
                options: [
                    {
                        name: "channel",
                        description: "Channel",
                        type: 7,
                        required: true,
                    },
                ],
            },
        })
        .then(({ id }) => {
            getApp(client, guildId)
                .commands(id)
                .permissions.put({
                    data: {
                        permissions: [
                            {
                                id: roleAdminId,
                                type: 1,
                                permission: true,
                            },
                        ],
                    },
                })
                .then(() => {
                    console.log(
                        "Command ADMIN " + ADMIN_CHANNEL_INFO + " DONE"
                    );
                });
        });

    console.log("Command ADMIN " + ADMIN_CHANNEL_TRACK);
    getApp(client, guildId)
        .commands.post({
            data: {
                name: ADMIN_CHANNEL_TRACK,
                description: "Channel to display stats of tracked",
                default_permission: false,
                options: [
                    {
                        name: "channel",
                        description: "Channel",
                        type: 7,
                        required: true,
                    },
                ],
            },
        })
        .then(({ id }) => {
            getApp(client, guildId)
                .commands(id)
                .permissions.put({
                    data: {
                        permissions: [
                            {
                                id: roleAdminId,
                                type: 1,
                                permission: true,
                            },
                        ],
                    },
                })
                .then(() => {
                    console.log(
                        "Command ADMIN " + ADMIN_CHANNEL_TRACK + " DONE"
                    );
                });
        });
    // !ADMIN

    // PLAYER
    console.log("Command PLAYER " + PLAYER_STATS);
    getApp(client, guildId)
        .commands.post({
            data: {
                name: PLAYER_STATS,
                description: "Get stats for a user",
                options: [
                    {
                        name: PLAYER_STATS_ME,
                        description: "Get stats for me",
                        type: 1,
                    },
                    {
                        name: PLAYER_STATS_PLAYER,
                        description: "Get stats for player",
                        type: 1,
                        options: [
                            {
                                name: "player",
                                description: "Player to get",
                                type: 6,
                                required: true,
                            },
                        ],
                    },
                ],
            },
        })
        .then(() => {
            console.log("Command PLAYER " + PLAYER_STATS + " DONE");
        });
    // !PLAYER

    // REGISTER
    console.log("Command REGISTER " + REGISTER_REGISTER);
    getApp(client, guildId)
        .commands.post({
            data: {
                name: REGISTER_REGISTER,
                description: "Register a player",
                options: [
                    {
                        name: "platform",
                        description: "Platform of username",
                        type: 3,
                        required: true,
                        choices: [
                            {
                                name: "Activision ID",
                                value: "acti",
                            },
                            {
                                name: "PlayStation",
                                value: "psn",
                            },
                            {
                                name: "XBOX",
                                value: "xbl",
                            },
                            {
                                name: "BattleNET",
                                value: "battle",
                            },
                        ],
                    },
                    {
                        name: "username",
                        description: "Username of player",
                        type: 3,
                        required: true,
                    },
                ],
            },
        })
        .then(() => {
            console.log("Command REGISTER " + REGISTER_REGISTER + " DONE");
        });

    console.log("Command REGISTER " + REGISTER_UNREGISTER);
    getApp(client, guildId)
        .commands.post({
            data: {
                name: REGISTER_UNREGISTER,
                description: "Unregister a player",
            },
        })
        .then(() => {
            console.log("Command REGISTER " + REGISTER_UNREGISTER + " DONE");
        });

    console.log("Command REGISTER " + REGISTER_CHANGE_PLAYER);
    getApp(client, guildId)
        .commands.post({
            data: {
                name: REGISTER_CHANGE_PLAYER,
                description: "Change player",
                options: [
                    {
                        name: "platform",
                        description: "Platform of username",
                        type: 3,
                        required: true,
                        choices: [
                            {
                                name: "Activision ID",
                                value: "acti",
                            },
                            {
                                name: "Battle.net",
                                value: "battle",
                            },
                            {
                                name: "PlayStation",
                                value: "psn",
                            },
                            {
                                name: "XBOX",
                                value: "xbl",
                            },
                        ],
                    },
                    {
                        name: "username",
                        description: "Username of player",
                        type: 3,
                        required: true,
                    },
                ],
            },
        })
        .then(() => {
            console.log("Command REGISTER " + REGISTER_CHANGE_PLAYER + " DONE");
        });
    // !REGISTER

    // TRACK
    console.log("Command TRACK " + TRACK_TRACK);
    getApp(client, guildId)
        .commands.post({
            data: {
                name: TRACK_TRACK,
                description: "Track a player",
            },
        })
        .then(() => {
            console.log("Command TRACK " + TRACK_TRACK + " DONE");
        });

    console.log("Command TRACK " + TRACK_UNTRACK);
    getApp(client, guildId)
        .commands.post({
            data: {
                name: TRACK_UNTRACK,
                description: "Untrack a player",
            },
        })
        .then(() => {
            console.log("Command TRACK " + TRACK_UNTRACK + " DONE");
        });
    // !TRACK
};

module.exports = {
    ADMIN_ROLE_PLAYER: ADMIN_ROLE_PLAYER,
    ADMIN_CHANNEL_INFO: ADMIN_CHANNEL_INFO,
    ADMIN_CHANNEL_TRACK: ADMIN_CHANNEL_TRACK,
    PLAYER_STATS: PLAYER_STATS,
    PLAYER_STATS_ME: PLAYER_STATS_ME,
    PLAYER_STATS_PLAYER: PLAYER_STATS_PLAYER,
    REGISTER_REGISTER: REGISTER_REGISTER,
    REGISTER_UNREGISTER: REGISTER_UNREGISTER,
    REGISTER_CHANGE_PLAYER: REGISTER_CHANGE_PLAYER,
    TRACK_TRACK: TRACK_TRACK,
    TRACK_UNTRACK: TRACK_UNTRACK,
    initSlashCommands: initSlashCommands,
};
