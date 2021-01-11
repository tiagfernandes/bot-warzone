module.exports = {
    login,
    getPlayerProfile,
    getBattleRoyaleInfo,
};

require("dotenv").config();

const API = require("call-of-duty-api")({ platform: "battle" });

async function login(){
    await API.login(process.env.API_USERNAME, process.env.API_PASSWORD);
}

async function getPlayerProfile(platform, username) {
    try {
        await API.MWBattleData(username, platform);
        return { username, platform };
    } catch (Error) {
        console.log(Error)
        return false;
    }
}

async function getBattleRoyaleInfo(platform, username) {
    try {
        let data = await API.MWBattleData(username, platform);
        return data.br;
    } catch (e) {
        console.error(e)
        return null;
    }
}
