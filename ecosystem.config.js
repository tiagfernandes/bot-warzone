module.exports = {
    apps: [
        {
            name: "bot-warzone",
            script: "index.js",
            watch: ".",
            env: {
                NODE_ENV: "dev",
            },
            env_production: {
                NODE_ENV: "prod",
            },
        },
    ],
};
