require("dotenv").config();
const MongoClient = require("mongodb").MongoClient;

let _db = null;

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

/**
 * Return User
 * @param {int} userId
 */
const getUser = async (userId) => {
    let user = await _db
        .collection("users")
        .findOne({ userId });

    return user;
};

const isUserAdded = async (channelId, username, platform) => {
    let userAdded = await _db.collection("channels").findOne({
        channelId,
        users: { $all: [{ username: username, platform: platform }] },
    });
    return userAdded != null;
};

const hasUser = async (username, platform) => {
    let user = await _db
        .collection("users")
        .findOne({ platform: platform, username: username });
    return user != null;
};

const addUserToChannel = async (channelId, username, platform) => {
    if (await isUserAdded(channelId, username, platform)) {
        throw "User already added!";
    }

    await _db.collection("channels").updateOne(
        { channelId },
        {
            $push: {
                users: { username, platform },
            },
        },
        {
            upsert: true,
        }
    );
};

const setScheduleToChannel = async (channelId, schedule) => {
    await _db.collection("channels").updateOne(
        { channelId },
        {
            $set: {
                schedule: schedule,
            },
        },
        {
            upsert: true,
        }
    );
};

/**
 *
 * @param {int} userId
 * @param {string} username
 * @param {string} platform
 */
const addUser = async (userId, username, platform) => {
    if (await hasUser(username, platform)) {
        throw "User already exist !";
    }

    await _db.collection("users").insertOne({
        userId: userId,
        username: username,
        platform: platform,
    });
};

const getUserFromChannel = async (channelId, username, platform) => {
    let r = await _db.collection("channels").findOne(
        {
            channelId,
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
        .collection("users")
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

const addStatsFromUser = async (userId, stats) => {
    if (await hasStatsFromUser(userId)) {
        // Update
        await _db.collection("stats").updateOne(
            {
                userId,
            },
            {
                $set: {
                    stats,
                    dateInsert: new Date(),
                },
            }
        );
    } else {
        // Add
        await _db.collection("stats").insertOne({
            userId,
            stats,
            dateInsert: new Date(),
        });
    }
};

const hasStatsFromUser = async (userId) => {
    let stats = await _db.collection("stats").findOne({ userId });
    return stats != null;
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

const trackUser = async (userId, channelId) => {
    await _db.collection("users").updateOne(
        {
            userId,
        },
        {
            $set: {
                track: channelId,
            },
        }
    );
};

const untrackUser = async (userId) => {
    await _db.collection("users").updateOne(
        {
            userId,
        },
        {
            $unset: {
                track: "",
            },
        }
    );
};

module.exports = {
    init,
    findChannel,
    getUser,
    addUserToChannel,
    addUser,
    removeUserFromChannel,
    getUserFromChannel,
    getAllUsers,
    getLastStatsFromUser,
    addStatsFromUser,
    getLastMatchFromUser,
    addMatchFromUser,
    getAllUsersTracked,
    setScheduleToChannel,
    trackUser,
    untrackUser,
};
