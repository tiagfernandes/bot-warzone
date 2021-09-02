require("dotenv").config();

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

const findChannel = async function (channelId) {
    let channel = await _db.collection("channels").findOne({ channelId });
    // if channel not found in db, create it
    if (channel == null) {
        channel = { channelId, users: [], schedule: false };
        await _db.collection("channels").insertOne(channel);
    }
    return channel;
};

const setChannelTrack = async (serverId, channelId) => {
    await _db.collection(SERVER_COLLECTION).updateOne(
        { serverId },
        {
            $set: {
                channel_track: channelId,
            },
        }
    );
};

const getAllServersWithChannelTrack = async () => {
    const servers = await _db.collection(SERVER_COLLECTION).find({
        channel_track: { $exists: true },
    }).toArray();
    return servers;
};

const getAllUsersTrackedFromServer = async (serverId) => {
    const server = await _db.collection(SERVER_COLLECTION).findOne({
        serverId: serverId,
    });

    console.log(server);

    if (server) {
        const users = await _db.collection(USER_COLLECTION).find({
            _id: { $in: server.users },
            channel_track: { $exists: true },
        }).toArray();

        return users;
    }
    return [];
};

/**
 * Return User
 * @param {int} userId
 */
const getUser = async (userId) => {
    const user = await _db.collection(USER_COLLECTION).findOne({ userId });

    return user;
};

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

const isUserAdded = async (channelId, username, platform) => {
    let userAdded = await _db.collection("server").findOne({
        channelId,
        users: { $all: [{ username: username, platform: platform }] },
    });
    return userAdded != null;
};

const hasUser = async (username, platform) => {
    let user = await _db.collection(USER_COLLECTION).findOne({
        platform: new RegExp(platform, "i"),
        username: new RegExp(username, "i"),
    });
    return user != null;
};

const addPlayer = async (interaction, username, platform) => {
    if (await isUserAdded(interaction.guild_id, username, platform)) {
        throw "User already added!";
    }

    if (await hasUser(username, platform)) {
        throw "User already exist !";
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

const removeUserFromChannel = async (channelId, username, platform) => {
    await _db.collection("channels").updateOne(
        { channelId },
        {
            $pull: {
                users: { username, platform },
            },
        }
    );
};

const getAllUsers = async (channelId) => {
    let channel = await findChannel(channelId);
    return channel.users;
};

const getAllUsersTracked = async () => {
    return _db
        .collection(USER_COLLECTION)
        .find({ track: { $ne: null } })
        .toArray()
        .then((items) => {
            return items;
        })
        .catch((err) => console.error(`Failed to find documents: ${err}`));
};

const getLastStatsFromUser = async (userId) => {
    let r = await _db.collection("stats").findOne({ userId });
    return r ? r : null;
};

const setStatsUser = async (userId, stats) => {
    await _db.collection(USER_COLLECTION).updateOne(
        {
            userId,
        },
        {
            $set: {
                stats,
                statsDateInsert: new Date(),
            },
        }
    );
};

const getLastMatchFromUser = async (userId) => {
    let r = await _db.collection("match").findOne({ userId });
    return r ? r : null;
};

const addMatchFromUser = async (userId, matchId) => {
    if (await hasMatchFromUser(userId)) {
        // Update
        await _db.collection("match").updateOne(
            {
                userId,
            },
            {
                $set: {
                    matchId,
                    dateInsert: new Date(),
                },
            }
        );
    } else {
        // Add
        await _db.collection("match").insertOne({
            userId,
            matchId,
            dateInsert: new Date(),
        });
    }
};

const hasMatchFromUser = async (userId) => {
    let match = await _db.collection("match").findOne({ userId });
    return match != null;
};

const trackUser = async (userId) => {
    await _db.collection(USER_COLLECTION).updateOne(
        {
            userId,
        },
        {
            $set: {
                track: true,
            },
        }
    );
};

const untrackUser = async (userId) => {
    await _db.collection(USER_COLLECTION).updateOne(
        {
            userId,
        },
        {
            $set: {
                track: false,
            },
        }
    );
};

module.exports = {
    init: init,
    getAllServersWithChannelTrack: getAllServersWithChannelTrack,
    getAllUsersTrackedFromServer: getAllUsersTrackedFromServer,
    findChannel,
    getUser: getUser,
    addPlayer: addPlayer,
    modifyPlayer: modifyUser,
    removeUser: removeUser,
    removeUserFromChannel,
    getUserFromServer: getUserFromServer,
    getAllUsers: getAllUsers,
    getLastStatsFromUser,
    setStatsUser,
    getLastMatchFromUser,
    addMatchFromUser,
    getAllUsersTracked,
    trackUser: trackUser,
    untrackUser: untrackUser,
    setChannelTrack: setChannelTrack,
};
