# LBS Interior Studio

An Expo / React Native mobile app for configuring a wardrobe during a customer visit. The first release includes a furniture catalog, a dimensioned wardrobe editor, a searchable Meraki laminate library, native room placement and device-local project specifications.

## Run the app

Use Node.js 22.13 or later and run `npm ci`. Start the browser preview with `npm run web`.

For Android, connect an ARCore-compatible phone with Google Play Services for AR installed, configure the Android SDK and run `npm run android -- --device`. On macOS with Xcode, CocoaPods and device signing configured, connect an ARKit-capable iPhone and run `npm run ios -- --device`. The native commands generate the platform projects and compile an Expo development build with ViroReact. The iOS command also exports the New Architecture setting required during pod installation.

## Design and project flow

1. Open **Studio wardrobe**. Change width, height, depth, door count or compartment layout. Switch between exterior and interior views.
2. Choose a laminate by sample or MRK code. The selected sample follows the design into the preview, room placement and saved specification.
3. On a supported phone, open **View in room**, grant camera access, scan the floor and tap a detected plane. Turn the model or place it again. The browser and unsupported devices provide the dimensioned preview.
4. Name the project, optionally enter a salesperson's estimate including its currency, and save. Reopen the design from **Projects** or share its specification. Project records stay in local app storage.

## Model and material sources

`src/model.ts` defines the wardrobe as boards, shelves, rails, doors and pulls. Configuration dimensions use millimetres and geometry uses metres, with the origin at floor level. Both the preview and the native AR renderer consume those parts. The catalog cover is a separate rendered view of the default configuration.

The 18 sample images are crops from the supplied Meraki PVC laminates PDF, pages 9 (Luxury Aura, six wood samples) and 44 (Ultra Radiant, twelve samples), counting the cover as page 1. MRK codes identify the supplier products. The English color names are descriptive app labels. Screen color and cropped grain are approximate.

## Verification and remaining work

Run `npm test` for physical bounds and compartment tests, `npm run check` for TypeScript, and `npx expo export --platform all` to bundle iOS, Android and web.

Before field use, verify detection, permission handling, placement scale and rotation on physical ARKit and ARCore devices against a measured reference. Account login, centralized project storage, customer approval, room photo capture, automated quotations and order administration remain future milestones.
