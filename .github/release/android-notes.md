Installs over 0.1.6 and 0.1.7 and keeps your saved designs. If you still have 0.1.5 or earlier, uninstall it first (share any project specification you want to keep, because uninstalling deletes saved projects).

**Fixes full-size AR not starting**

- View in room failed with "Cannot read property 'getAssetByID' of undefined" while loading the laminate texture into AR, so AR never opened. This is fixed, and the AR view now opens with the selected finish.
- If Google Play Services for AR is missing or out of date, accept the prompt to install or update it.
- If AR still does not start, the on-screen panel shows the reason, an **Install or update Google Play Services for AR** button and **Try again**.
