require("dotenv").config();

const moment = require("moment");
const mongo = require("mongodb");
const MongoClient = mongo.MongoClient;

let _db = null;

const SERVER_COLLECTION = "server";
const USER_COLLECTION = "user";

const init = async () => {
    try {
        const client = await MongoClient.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        _db = client.db(process.env.MONGO_DBNAME);
    } catch (e) {
        console.error(e);
    }
};

/**
 * Get servers with channel track
 *
 * @return array
 */
const getServersWithChannelTrack = async () => {
    const servers = await _db
        .collection(SERVER_COLLECTION)
        .find({
            channel_track_id: { $exists: true },
        })
        .toArray();
    return servers;
};

/**
 * Return users tracked by guildId
 *
 * @param {int} serverId
 *
 * @return array
 */
const getAllUsersTrackedFromServer = async (serverId) => {
    const server = await _db.collection(SERVER_COLLECTION).findOne({
        serverId: serverId,
    });

    if (server) {
        const users = await _db
            .collection(USER_COLLECTION)
            .find({
                _id: { $in: server.users },
                track: { $exists: true },
            })
            .toArray();

        return users;
    }
    return [];
};

/**
 * Get user by id
 *
 * @param {int} userId
 *
 * @return user
 */
const getUser = async (userId) => {
    const user = await _db.collection(USER_COLLECTION).findOne({ userId });

    return user;
};

/**
 * Remove user by id
 *
 * @param {int} idUser
 */
const removeUser = async (idUser) => {
    await _db
        .collection(USER_COLLECTION)
        .deleteOne({ _id: mongo.ObjectID(idUser) });

    await _db.collection(SERVER_COLLECTION).updateMany(
        {},
        {
            $pull: { users: mongo.ObjectID(idUser) },
        }
    );
};

/**
 * Check if user exist
 *
 * @param {int|string} channelId
 * @param {string} username
 * @param {string} platform
 */
const isUserAdded = async (channelId, username, platform) => {
    let userAdded = await _db.collection(SERVER_COLLECTION).findOne({
        channelId,
        users: {
            $all: [
                {
                    username: new RegExp(username, "i"),
                    platform: new RegExp(platform, "i"),
                },
            ],
        },
    });
    return userAdded != null;
};

/**
 * Add player with username and platform
 *
 * @param {*} interaction
 * @param {string} username
 * @param {string} platform
 */
const addPlayer = async (interaction, username, platform) => {
    if (await isUserAdded(interaction.guild_id, username, platform)) {
        throw "User already added!";
    }

    await _db
        .collection(USER_COLLECTION)
        .insertOne({
            userId: interaction.member.user.id,
            username,
            platform,
        })
        .then(async (result) => {
            await _db.collection(SERVER_COLLECTION).updateOne(
                { serverId: interaction.guild_id },
                {
                    $push: {
                        users: mongo.ObjectId(result.insertedId),
                    },
                },
                {
                    upsert: true,
                }
            );
        });
};

/**
 * Update username and platform of user
 *
 * @param {*} interaction
 * @param {string} username
 * @param {string} platform
 */
const modifyUser = async (interaction, username, platform) => {
    if (await isUserAdded(interaction.guild_id, username, platform)) {
        throw "User already added!";
    }

    await _db
        .collection(USER_COLLECTION)
        .updateOne(
            { userId: interaction.member.user.id },
            { $set: { username, platform } }
        );
};

/**
 * Get user from server by username and platform
 *
 * @param {int|string} serverId
 * @param {string} username
 * @param {string} platform
 */
const getUserFromServer = async (serverId, username, platform) => {
    let r = await _db.collection(SERVER_COLLECTION).findOne(
        {
            serverId: serverId,
            users: {
                $elemMatch: {
                    username: new RegExp(username, "i"),
                    platform: platform,
                },
            },
        },
        {
            // only select matching user
            projection: { "users.$": 1 },
        }
    );
    return r ? r.users[0] : null;
};

/**
 * Set Stats to user
 *
 * @param {int} userId
 * @param {array} stats
 */
const setStatsUser = async (userId, stats) => {
    await _db.collection(USER_COLLECTION).updateOne(
        {
            userId: userId,
        },
        {
            $set: {
                stats,
                statsDateInsert: new Date(),
            },
        }
    );
};

/**
 * Track an user
 *
 * @param {int} userId
 */
const trackUser = async (userId) => {
    await _db.collection(USER_COLLECTION).updateOne(
        {
            userId,
        },
        {
            $set: {
                track: true,
                trackedAt: moment().unix(),
            },
        }
    );
};

/**
 * Untrack an user
 *
 * @param {int} userId
 */
const untrackUser = async (userId) => {
    await _db.collection(USER_COLLECTION).updateOne(
        {
            userId,
        },
        {
            $set: {
                track: false,
            },
            $unset: {
                trackedAt: null,
            },
        }
    );
};

/**
 * Set matchs to user
 * 
 * @param {*} userId
 * @param {array} matches
 */
const setMatchesToPlayer = async (userId, matches) => {
    await _db.collection(USER_COLLECTION).updateOne(
        {
            userId,
        },
        {
            $set: {
                matches: matches,
            },
        }
    );
};

/**
 * Get Server by id
 *
 * @param {integer} serverId
 * @returns
 */
const getServerById = async (serverId) => {
    return await _db.collection(SERVER_COLLECTION).findOne({
        serverId,
    });
};

/**
 * Set channel info to server
 *
 * @param {integer} serverId
 * @param {integer} channelId
 * @returns
 */
const setChannelInfo = async (serverId, channelId) => {
    return await _db.collection(SERVER_COLLECTION).updateOne(
        { serverId },
        {
            $set: {
                channel_info_id: channelId,
            },
        }
    );
};

/**
 * Set message info to server
 *
 * @param {integer} serverId
 * @param {integer} messageId
 *
 * @returns
 */
const setMessageInfo = async (serverId, messageId) => {
    return await _db.collection(SERVER_COLLECTION).updateOne(
        { serverId },
        {
            $set: {
                message_info_id: messageId,
            },
        }
    );
};

/**
 * If has server by id
 * 
 * @param {integer} serverId
 */
const hasServer = async (serverId) => {
    const server = await _db
        .collection(SERVER_COLLECTION)
        .findOne({ serverId: serverId });

    return server ? true : false;
};

// Admin

/**
 * Set channel track to server
 *
 * @param {int} serverId
 * @param {int} channelId
 */
const setChannelTrack = async (serverId, channelId) => {
    await _db.collection(SERVER_COLLECTION).updateOne(
        { serverId },
        {
            $set: {
                channel_track_id: channelId,
            },
        }
    );
};

/**
 * Set role admin to server
 *
 * @param {int} serverId
 * @param {int} roleAdminId
 */
const setRoleAdminId = async (serverId, roleAdminId) => {
    if (await hasServer(serverId)) {
        await _db.collection(SERVER_COLLECTION).updateOne(
            { serverId },
            {
                $set: {
                    role_admin_id: roleAdminId,
                },
            }
        );
    } else {
        await _db
            .collection(SERVER_COLLECTION)
            .insertOne({ serverId: serverId, role_admin_id: roleAdminId });
    }
};

/**
 * Set role player to server
 *
 * @param {int} serverId
 * @param {int} rolePlayerId
 */
const setRolePlayerId = async (serverId, rolePlayerId) => {
    await _db.collection(SERVER_COLLECTION).updateOne(
        { serverId },
        {
            $set: {
                role_player_id: rolePlayerId,
            },
        }
    );
};
// !Admin

/**
 * Get server by serverId, channelInfoId, messageInfoId
 * 
 * @param {*} guildId
 * @param {*} channelId
 * @param {*} messageId
 * @returns
 */
const getServerByGuildChannelMessage = async (
    guildId,
    channelId,
    messageId
) => {
    return await _db.collection(SERVER_COLLECTION).findOne({
        serverId: guildId,
        channel_info_id: channelId,
        message_info_id: messageId,
    });
};

module.exports = {
    init: init,
    getServersWithChannelTrack: getServersWithChannelTrack,
    getAllUsersTrackedFromServer: getAllUsersTrackedFromServer,
    getUser: getUser,
    addPlayer: addPlayer,
    modifyPlayer: modifyUser,
    removeUser: removeUser,
    getUserFromServer: getUserFromServer,
    setStatsUser: setStatsUser,
    trackUser: trackUser,
    untrackUser: untrackUser,
    setChannelTrack: setChannelTrack,
    setMatchesToPlayer: setMatchesToPlayer,
    setRoleAdminId: setRoleAdminId,
    setRolePlayerId: setRolePlayerId,
    getServerById: getServerById,
    setMessageInfo: setMessageInfo,
    setChannelInfo: setChannelInfo,
    getServerByGuildChannelMessage: getServerByGuildChannelMessage,
};
