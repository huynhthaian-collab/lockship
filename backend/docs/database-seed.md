# Import local sample data

## MongoDB Compass

Import the files in `compass-import` into the `lockship` database in this order:

1. `users.json` → `users`
2. `vehicles.json` → `vehicles`
3. `iotdevices.json` → `iotdevices`
4. `deliveries.json` → `deliveries`

Choose JSON as the import file type. These are MongoDB Extended JSON
documents: `$oid` values must be imported as ObjectIds so the references
between the collections work. The demo Owner and Shipper can both log in with
`LockShipDemo!2026`. Their password fields already contain bcrypt hashes;
Compass does not run the application's password-hashing middleware. These
credentials are for local development only.

The IoT device record includes a credential ID but not a device token. For an
IoT simulation, prefer the seed script below; it creates the same linked data
and prints a signed device token for the simulator.

The root `db.json` is the combined fixture used by the script below. The script
imports its linked documents through the application's Mongoose models, so
account passwords are bcrypt-hashed before they are stored.

## Seed script

From PowerShell, run the following in `backend`:

```powershell
$env:LOCKSHIP_SEED_PASSWORD = "Choose-a-local-password"
npm run db:seed
Remove-Item Env:LOCKSHIP_SEED_PASSWORD
```

The script connects to `MONGODB_URI` from `backend/.env`. It refuses to import
if any fixture user email/ObjectId, vehicle plate/ObjectId, device ID/ObjectId,
or delivery ObjectId already exists. It does not overwrite existing records.
After import, configure the IoT simulator with the printed device ID and token.
The sample device starts offline until the simulator connects to the same MQTT
broker configured in the backend.

The seeded accounts are local-development accounts. Do not use them in
production; use a unique password and keep the generated device token private.

## Add only the demo Admin in Compass

If the Owner/Shipper and other sample documents have already been imported,
import `compass-import/admin.json` into the existing `users` collection. Do not
re-import `users.json`, because it also contains the Owner and Shipper.

Admin login: `admin.demo@lockship.local`

Password: `LockShipDemo!2026` (same bcrypt hash as the other local demo accounts).
This is a local-development credential only.
