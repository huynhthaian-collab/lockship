import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const seedDir = path.resolve(__dirname, "../seed-data");

function toExtendedJson(val) {
    if (val === null || val === undefined) return val;
    if (Array.isArray(val)) return val.map(toExtendedJson);
    if (val instanceof mongoose.Types.ObjectId || val?._bsontype === "ObjectID" || val?.constructor?.name === "ObjectId") {
        return { $oid: val.toString() };
    }
    if (val instanceof Date) {
        return { $date: val.toISOString() };
    }
    if (typeof val === "object") {
        const res = {};
        for (const [k, v] of Object.entries(val)) {
            res[k] = toExtendedJson(v);
        }
        return res;
    }
    return val;
}

const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/lockship";
await mongoose.connect(mongoUri);
const db = mongoose.connection.db;

const users = await db.collection("users").find().toArray();
fs.writeFileSync(path.join(seedDir, "users.json"), JSON.stringify(toExtendedJson(users), null, 2));

const vehicles = await db.collection("vehicles").find().toArray();
fs.writeFileSync(path.join(seedDir, "vehicles.json"), JSON.stringify(toExtendedJson(vehicles), null, 2));

const iotdevices = await db.collection("iotdevices").find().toArray();
fs.writeFileSync(path.join(seedDir, "iotdevices.json"), JSON.stringify(toExtendedJson(iotdevices), null, 2));

const deliveries = await db.collection("deliveries").find().toArray();
fs.writeFileSync(path.join(seedDir, "deliveries.json"), JSON.stringify(toExtendedJson(deliveries), null, 2));

const iotevents = await db.collection("iotevents").find().toArray();
fs.writeFileSync(path.join(seedDir, "iotevents.json"), JSON.stringify(toExtendedJson(iotevents), null, 2));

// Update lockship-full-db.json
const fullDbPath = path.join(seedDir, "lockship-full-db.json");
if (fs.existsSync(fullDbPath)) {
    const fullDb = JSON.parse(fs.readFileSync(fullDbPath, "utf8"));
    fullDb.users = toExtendedJson(users);
    fullDb.vehicles = toExtendedJson(vehicles);
    fullDb.iotdevices = toExtendedJson(iotdevices);
    fullDb.deliveries = toExtendedJson(deliveries);
    fullDb.iotevents = toExtendedJson(iotevents);
    fs.writeFileSync(fullDbPath, JSON.stringify(fullDb, null, 2));
}

console.log("✓ Seed fixtures updated successfully in backend/seed-data/!");
await mongoose.disconnect();
process.exit(0);

