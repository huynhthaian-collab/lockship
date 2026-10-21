# Delivery end-to-end tests

Run the backend lifecycle tests with a local MongoDB instance:

```powershell
npm run test:e2e
```

The tests use the separate `lockship-e2e-test` database by default. Set
`MONGODB_URI` to use a different disposable test database. Test accounts and
their delivery, vehicle, device, notification, unlock-code, and IoT-event
records are removed when the test finishes.

HTTP requests, JWT authentication, MongoDB persistence, Socket.IO events, and
the IoT simulator are exercised together. SMTP is replaced with a test mail
transport, and an in-memory MQTT bridge connects the real simulator behavior
to the backend's authenticated device-message handler; no external SMTP server
or MQTT broker is required.
