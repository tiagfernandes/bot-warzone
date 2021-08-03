require("dotenv").config();

const env = process.env.NODE_ENV || "dev";

const API = require("call-of-duty-api")();

async function login() {
    if (env == "dev") {
        if (!process.env.TOKEN_SSO_COOKIE) {
            throw Error("Env variable TOKEN_SSO_COOKIE is required");
        }

        return API.loginWithSSO(process.env.TOKEN_SSO_COOKIE);
    } else {
        if (!process.env.API_USERNAME) {
            throw Error("Env variable API_USERNAME is required");
        }
        if (!process.env.API_PASSWORD) {
            throw Error("Env variable API_PASSWORD is required");
        }
        if (!process.env.TOKEN_2CAPTCHA) {
            throw Error("Env variable TOKEN_2CAPTCHA is required");
        }

        return API.login(
            process.env.API_USERNAME,
            process.env.API_PASSWORD,
            process.env.TOKEN_2CAPTCHA
        );
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
