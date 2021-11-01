require("dotenv").config();

const env = process.env.NODE_ENV || "dev";

const API = require("call-of-duty-api")();

/**
 * Login to Call-of-Duty API
 * @returns
 */
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

/**
 * @param {*} platform
 * @param {*} username
 * @returns
 */
const getPlayerProfile = async (platform, username) => {
    try {
        const wz = await API.MWwz(username, platform);
        return {
            username: wz.username,
            platform: platform,
        };
    } catch (Error) {
        console.log(Error);
        return null;
    }
};

/**
 *
 * @param {*} platform
 * @param {*} username
 * @returns
 */
const getBattleRoyaleInfo = async (platform, username) => {
    try {
        let data = await API.MWBattleData(username, platform);
        return data.br;
    } catch (e) {
        console.error(e);
        return null;
    }
};

/**
 *
 * @param {*} platform
 * @param {*} username
 * @return array
 */
const getBattleRoyaleMatchs = async (platform, username) => {
    let data = await API.MWcombatwz(username, platform);
    return data.matches ?? [];
};

module.exports = {
    login: login,
    getPlayerProfile: getPlayerProfile,
    getBattleRoyaleInfo: getBattleRoyaleInfo,
    getBattleRoyaleMatchs: getBattleRoyaleMatchs,
};
