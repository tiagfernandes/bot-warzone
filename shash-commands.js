const guildId = process.env.GUILD_ID;
const ADMIN_ROLE_ID = process.env.ADMIN_ROLE_ID;

const getApp = (client) => {
    const app = client.api.applications(client.user.id);
    if (guildId) {
        app.guilds(guildId);
    }
    return app;
};

const initSlashCommands = async (client) => {
    console.log("register");
    await getApp(client).commands.post({
        data: {
            name: "register",
            description: "Register a player",
            options: [
                {
                    name: "platform",
                    description: "Platform of username",
                    type: 3,
                    required: true,
                    choices: [
                        {
                            name: "PlayStation",
                            value: "psn",
                        },
                        {
                            name: "Steam",
                            value: "steam",
                        },
                        {
                            name: "BattleNET",
                            value: "battle",
                        },
                        {
                            name: "XBOX",
                            value: "xbl",
                        },
                        {
                            name: "Activision ID",
                            value: "acti",
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
    });

    console.log("change-player");
    await getApp(client).commands.post({
        data: {
            name: "change-player",
            description: "Change player",
            options: [
                {
                    name: "platform",
                    description: "Platform of username",
                    type: 3,
                    required: true,
                    choices: [
                        {
                            name: "PlayStation",
                            value: "psn",
                        },
                        {
                            name: "Steam",
                            value: "steam",
                        },
                        {
                            name: "BattleNET",
                            value: "battle",
                        },
                        {
                            name: "XBOX",
                            value: "xbl",
                        },
                        {
                            name: "Activision ID",
                            value: "acti",
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
    });
    
    console.log("unregister");
    await getApp(client).commands.post({
        data: {
            name: "unregister",
            description: "Unregister a player",
        },
    });

    /*console.log("track");
    await getApp(client).commands.post({
        data: {
            name: "track",
            description: "Track a player",
        },
    });

    console.log("untrack");
    await getApp(client).commands.post({
        data: {
            name: "untrack",
            description: "Untrack a player",
        },
    });

    if (ADMIN_ROLE_ID) {
        console.log("channel-track");
        await getApp(client).commands.post({
            data: {
                name: "channel-track",
                description: "Channel to display stats of tracked",
                options: [
                    {
                        name: "channel",
                        description: "Channel",
                        type: 7,
                        required: true,
                    },
                ],
                permissions: [
                    {
                        id: ADMIN_ROLE_ID,
                        type: 1,
                        permission: false,
                    },
                ],
            },
        });
    }

    console.log("stats");
    await getApp(client).commands.post({
        data: {
            name: "stats",
            description: "Get stats for a user",
            options: [
                {
                    name: "me",
                    description: "Get stats for me",
                    type: 1,
                },
                {
                    name: "player",
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
    });*/
};

module.exports = { initSlashCommands };
