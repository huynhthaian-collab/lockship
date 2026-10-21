# LOCKSHIP Socket.IO Events

Connect to the backend Socket.IO endpoint with the existing access JWT:

```js
io(API_URL, { auth: { token: accessToken } });
```

The server validates signature, expiry, revocation, account status, and token version. It places the connection only in its authenticated `user:<id>` room. Clients cannot request arbitrary room membership. The frontend connects to Socket.IO only; MQTT remains backend/device-only.

| Event | Recipients | Payload fields |
| --- | --- | --- |
| `delivery:arrived` | Delivery owner | `deliveryId`, `shipperId`, `vehicleId`, addresses, status, `arrivedAt` |
| `delivery:authorized` | Assigned shipper | `deliveryId`, status, `authorizedAt`, `unlockExpiresAt` |
| `unlock:requested` | Owner and shipper | `deliveryId`, `requestId`, pending status |
| `unlock:success` | Shipper | `deliveryId`, `requestId`, status, `lockStatus` |
| `unlock:failed` | Shipper and owner | `deliveryId`, `requestId` when available, status, `errorCode` |
| `iot:status` | Device owner | `deviceId`, online status, `lockStatus`, battery, `lastSeen`, firmware version |
| `iot:alert` | Device owner | `deviceId`, alert type, sanitized payload, occurrence time |
| `notification:new` | Notification recipient | notification ID, type, title, message, delivery ID, read state, creation time |

Payloads are server-generated and sanitized. Access tokens, device tokens, passwords, unlock codes, and credential fields are not emitted. The unlock code is delivered out-of-band by email and is never sent over Socket.IO.
