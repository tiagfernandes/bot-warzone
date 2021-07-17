require("dotenv").config();

const API = require("call-of-duty-api")({ platform: "all" });

async function login() {
    try {
        await API.login(process.env.API_USERNAME, process.env.API_PASSWORD);
    } catch (e) {
        console.error(e);
    }
}

const getPlayerProfile = async (platform, username) => {
    try {
        await API.MWBattleData(username, platform);
        return { username, platform };
    } catch (Error) {
        console.log(Error);
        return false;
    }
};

const getBattleRoyaleInfo = async (platform, username) => {
    try {
        let data = await API.MWBattleData(username, platform);
        return data.br;
    } catch (e) {
        console.error(e);
        return null;
    }
};

const getBattleRoyaleMatchs = async (platform, username) => {
    let data = await API.MWcombatwz(username, platform);
    return data.matches;
};

const getBattleInfoTest = async (platform, username) => {
    return await API.MWwz(username, platform);
};

module.exports = {
    login,
    getPlayerProfile,
    getBattleRoyaleInfo,
    getBattleRoyaleMatchs,
    getBattleInfoTest,
};
