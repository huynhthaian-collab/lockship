import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { env } from "../src/config/env.js";
import Delivery from "../src/models/delivery.model.js";
import IoTDevice from "../src/models/iot-device.model.js";
import User from "../src/models/user.model.js";
import Vehicle from "../src/models/vehicle.model.js";

const fixturePath = fileURLToPath(new URL("../db.json", import.meta.url));
const fixture = JSON.parse(await readFile(fixturePath, "utf8"));
const seedPassword = process.env.LOCKSHIP_SEED_PASSWORD;

if (!seedPassword || seedPassword.length < 8 || seedPassword.length > 128) {
    throw new Error("Set LOCKSHIP_SEED_PASSWORD to a password between 8 and 128 characters before importing.");
}

const ids = [
    ...Object.values(fixture.users).map(({ _id }) => _id),
    fixture.vehicle._id,
    fixture.iotDevice._id,
    fixture.delivery._id,
];
if (ids.some((id) => !mongoose.isValidObjectId(id)) || new Set(ids).size !== ids.length) {
    throw new Error("The seed fixture must use distinct valid MongoDB ObjectIds.");
}

const ownerId = new mongoose.Types.ObjectId(fixture.users.owner._id);
const shipperId = new mongoose.Types.ObjectId(fixture.users.shipper._id);
const vehicleId = new mongoose.Types.ObjectId(fixture.vehicle._id);
const deviceId = new mongoose.Types.ObjectId(fixture.iotDevice._id);
const deliveryId = new mongoose.Types.ObjectId(fixture.delivery._id);

async function assertFixtureDoesNotExist() {
    const existingUser = await User.findOne({
        $or: [
            { _id: { $in: [ownerId, shipperId] } },
            { email: { $in: Object.values(fixture.users).map(({ email }) => email) } },
        ],
    }).select("_id email");
    if (existingUser) {
        throw new Error(`Seed stopped: user ${existingUser.email} or its ObjectId already exists.`);
    }

    const existingVehicle = await Vehicle.findOne({
        $or: [{ _id: vehicleId }, { plateNumber: fixture.vehicle.plateNumber }],
    }).select("_id plateNumber");
    if (existingVehicle) {
        throw new Error(`Seed stopped: vehicle ${existingVehicle.plateNumber} or its ObjectId already exists.`);
    }

    const existingDevice = await IoTDevice.findOne({
        $or: [{ _id: deviceId }, { deviceId: fixture.iotDevice.deviceId }],
    }).select("_id deviceId");
    if (existingDevice) {
        throw new Error(`Seed stopped: IoT device ${existingDevice.deviceId} or its ObjectId already exists.`);
    }

    const existingDelivery = await Delivery.exists({ _id: deliveryId });
    if (existingDelivery) {
        throw new Error(`Seed stopped: delivery ObjectId ${deliveryId} already exists.`);
    }
}

const created = [];

try {
    await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
    await assertFixtureDoesNotExist();

    const users = await User.create([
        ...Object.values(fixture.users).map((user) => ({ ...user, password: seedPassword })),
    ]);
    created.push({ model: User, ids: users.map(({ _id }) => _id) });

    const [vehicle] = await Vehicle.create([fixture.vehicle]);
    created.push({ model: Vehicle, ids: [vehicle._id] });

    const [device] = await IoTDevice.create([fixture.iotDevice]);
    created.push({ model: IoTDevice, ids: [device._id] });

    const [delivery] = await Delivery.create([fixture.delivery]);
    created.push({ model: Delivery, ids: [delivery._id] });

    const deviceToken = jwt.sign(
        { scope: "iot-device" },
        env.MQTT_DEVICE_TOKEN_SECRET,
        {
            subject: device.deviceId,
            jwtid: device.credentialId,
            audience: "lockship-iot-device",
            expiresIn: env.MQTT_DEVICE_TOKEN_TTL,
        },
    );

    console.info("LOCKSHIP sample data imported.");
    for (const user of Object.values(fixture.users)) {
        console.info(`${user.role} login: ${user.email}`);
    }
    console.info("All accounts use the password supplied in LOCKSHIP_SEED_PASSWORD.");
    console.info(`IoT device ID: ${device.deviceId}`);
    console.info(`IoT device token (copy to the simulator's DEVICE_TOKEN): ${deviceToken}`);
    console.info(`Delivery ID: ${delivery._id}`);
} catch (error) {
    for (const entry of created.reverse()) {
        await entry.model.deleteMany({ _id: { $in: entry.ids } });
    }
    throw error;
} finally {
    await mongoose.disconnect();
}
