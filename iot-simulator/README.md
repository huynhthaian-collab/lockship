# LOCKSHIP IoT Simulator

Standalone Node.js MQTT client that simulates one provisioned LOCKSHIP device. The simulator subscribes to its command topic and publishes authenticated status, event, and alert messages. The frontend does not connect to MQTT.

## Setup

```powershell
Copy-Item .env.example .env
npm install
npm run start
```

Set `DEVICE_ID` and `DEVICE_TOKEN` from the device-registration response at `POST /api/iot`. Configure the MQTT broker credentials and URL for this device. The broker ACL should let this identity subscribe only to its own command topic and publish only to its own status, event, and alert topics.

## Simulation controls

`SIMULATE_UNLOCK_FAILURE=true` makes every `UNLOCK` command fail. `UNLOCK_FAILURE_RATE` can instead set a failure probability between `0` and `1`. `STATUS_INTERVAL_MS` controls heartbeat status messages. Ctrl+C publishes an offline status; the MQTT Last Will publishes offline status if the connection is lost unexpectedly.

Commands are validated for a UUID `requestId`; `UNLOCK` also requires a MongoDB `deliveryId`. Invalid commands publish an `unauthorized_access` alert without echoing the incoming payload. Unlock results use the `unlock_result` event contract documented in `../backend/docs/mqtt-protocol.md`.

Run simulator tests with `npm test`.