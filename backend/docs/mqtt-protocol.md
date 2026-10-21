# LOCKSHIP MQTT Contract

The frontend uses REST only. It must never connect to the MQTT broker.

## Provisioning and Authentication

Register a device with `POST /api/iot`. The response contains `device` and a signed `deviceToken`. Store that token securely on the device; the API does not store or return it again. The device includes this token in each status, event, and alert JSON message. The backend verifies its signature, expiry, audience, and `deviceId` subject against the topic before accepting the message.

The backend MQTT client authenticates to the broker with `MQTT_USERNAME` and `MQTT_PASSWORD`. Configure broker ACLs so device clients can publish only to their own status/event/alert topics and subscribe only to their own command topic. Use `mqtts://` in production.

## Topics

| Direction | Topic | Purpose |
| --- | --- | --- |
| Backend to device | `lockship/device/{deviceId}/command` | `LOCK`, `UNLOCK`, `STATUS`, `PING` |
| Device to backend | `lockship/device/{deviceId}/status` | Connectivity, lock state, battery, firmware |
| Device to backend | `lockship/device/{deviceId}/event` | Command results and device events |
| Device to backend | `lockship/device/{deviceId}/alert` | Device alerts and failures |

Commands are JSON with `command`, `requestId`, optional `deliveryId`, and `issuedAt`. The backend publishes with QoS 1 and does not retain commands.

## Status Message

Publish a signed device status to the device's `status` topic:

```json
{
  "deviceToken": "<signed-device-jwt>",
  "status": "online",
  "lockStatus": "locked",
  "battery": 86,
  "firmwareVersion": "1.2.0"
}
```

Devices should publish `status: "offline"` as their MQTT Last Will. The backend also marks devices offline when authenticated heartbeats exceed `MQTT_OFFLINE_AFTER_SECONDS`.

## Unlock Command Result

After executing an `UNLOCK` command, publish an event with the same `requestId` and `deliveryId` from the command. Set `success` to a JSON boolean and report the resulting lock state:

```json
{
  "deviceToken": "<signed-device-jwt>",
  "event": "unlock_result",
  "command": "UNLOCK",
  "requestId": "11111111-1111-4111-8111-111111111111",
  "deliveryId": "507f1f77bcf86cd799439013",
  "success": true,
  "lockStatus": "unlocked"
}
```

For a failure, send `success: false`, `lockStatus: "locked"`, and optionally a sanitized `details` string. The backend records `DEVICE_UNLOCK_FAILED`, leaves the delivery incomplete, and notifies the shipper and owner. It only sets the delivery's unlock outcome to succeeded after a matching authenticated result arrives.

The successful `POST /api/deliveries/:id/unlock` response means the code was accepted and the MQTT command was queued by the broker; it does not mean the physical lock has opened. The response includes `requestId`. The delivery remains `authorized` with `unlockStatus: "pending"` until the signed `unlock_result` arrives. A shipper can complete the delivery only after the backend records `unlockStatus: "succeeded"`.

Unlock API failures use the standard response envelope and put the machine-readable value in `data.errorCode`: `INVALID_CODE`, `CODE_EXPIRED`, `CODE_ALREADY_USED`, `MAX_ATTEMPTS`, `DEVICE_OFFLINE`, `DEVICE_UNLOCK_FAILED`, or `DELIVERY_NOT_AUTHORIZED`. An asynchronous device failure is recorded in IoT logs and surfaced to the owner and shipper notifications; attempting completion then returns `DEVICE_UNLOCK_FAILED`.
