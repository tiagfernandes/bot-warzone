module.exports = {
    addUserToChannel,
    addUser,
    removeUserFromChannel,
    getUserFromChannel,
    getAllUsers,
    getUser,
    init,
    getLastStatsFromUser,
    addStatsFromUser,
    getLastMatchFromUser,
    addMatchFromUser,
    getAllUsersTracked,
    setScheduleToChannel,
    findChannel,
    trackUser,
    untrackUser,
};
require("dotenv").config();
const MongoClient = require("mongodb").MongoClient;

let _db = null;

async function init() {
    const client = await MongoClient.connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });
    _db = client.db(process.env.MONGO_DBNAME);
}

async function findChannel(channelId) {
    let channel = await _db.collection("channels").findOne({ channelId });
    // if channel not found in db, create it
    if (channel == null) {
        channel = { channelId, users: [], schedule: false };
        await _db.collection("channels").insertOne(channel);
    }
    return channel;
}

/**
 * Return User
 * @param {int} userId
 */
async function getUser(userId) {
    let user = await _db
        .collection(process.env.MONGO_COLLECTION)
        .findOne({ userId });

    return user;
}

async function isUserAdded(channelId, username, platform) {
    let userAdded = await _db.collection("channels").findOne({
        channelId,
        users: { $all: [{ username: username, platform: platform }] },
    });
    return userAdded != null;
}

async function hasUser(username, platform) {
    let user = await _db
        .collection(process.env.MONGO_COLLECTION)
        .findOne({ platform: platform, username: username });
    return user != null;
}

async function addUserToChannel(channelId, username, platform) {
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
}

async function setScheduleToChannel(channelId, schedule) {
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
}

/**
 *
 * @param {int} userId
 * @param {string} username
 * @param {string} platform
 */
async function addUser(userId, username, platform) {
    if (await hasUser(username, platform)) {
        throw "User already exist !";
    }

    await _db.collection(process.env.MONGO_COLLECTION).insertOne({
        userId: userId,
        username: username,
        platform: platform,
    });
}

async function getUserFromChannel(channelId, username, platform) {
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
}

async function removeUserFromChannel(channelId, username, platform) {
    await _db.collection("channels").updateOne(
        { channelId },
        {
            $pull: {
                users: { username, platform },
            },
        }
    );
}

async function getAllUsers(channelId) {
    let channel = await findChannel(channelId);
    return channel.users;
}

async function getAllUsersTracked() {
    return _db
        .collection("users")
        .find({ track: { $ne: null } })
        .toArray()
        .then((items) => {
            return items;
        })
        .catch((err) => console.error(`Failed to find documents: ${err}`));
}

async function getLastStatsFromUser(userId) {
    let r = await _db.collection("stats").findOne({ userId });
    return r ? r : null;
}

async function addStatsFromUser(userId, stats) {
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
}

async function hasStatsFromUser(userId) {
    let stats = await _db.collection("stats").findOne({ userId });
    return stats != null;
}

async function getLastMatchFromUser(userId) {
    let r = await _db.collection("match").findOne({ userId });
    return r ? r : null;
}

async function addMatchFromUser(userId, matchId) {
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
}

async function hasMatchFromUser(userId) {
    let match = await _db.collection("match").findOne({ userId });
    return match != null;
}

async function trackUser(userId, channelId) {
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
}

async function untrackUser(userId) {
    await _db.collection("users").updateOne(
        {
            userId,
        },
        {
            $unset: {
                track,
            },
        }
    );
}
