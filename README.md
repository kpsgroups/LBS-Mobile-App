# LBS Interior Studio

An Expo / React Native mobile app for configuring a wardrobe during a customer visit. The first release includes a furniture catalog, a dimensioned wardrobe editor, a searchable Meraki laminate library, native room placement and device-local project specifications.

## Run the app

Use Node.js 22.13 or later and run `npm ci`. Start the browser preview with `npm run web`.

For Android, connect an Android phone, configure the Android SDK and run `npm run android -- --device`. On macOS with Xcode, CocoaPods and device signing configured, connect an ARKit-capable iPhone and run `npm run ios -- --device`. The native commands generate the platform projects and compile an Expo development build with ViroReact. The iOS command also exports the New Architecture setting required during pod installation.

## Design and project flow

1. Open **Studio wardrobe**. Change width, height, depth, door count or compartment layout. Switch between exterior and interior views.
2. Choose a laminate by sample or MRK code. The selected sample follows the design into the preview, room placement and saved specification.
   The catalog also has TV units, wall panels, partitions and designer wardrobes with marble, stone, gloss and slatted feature panels, LED strips, bronze mirrors and gold trims. These designs take up to three Meraki laminates: the main laminate, a **feature panel** (for example the marble slab) and a **detail finish** (for example slats or shelves). The editor shows a picker for each laminate the design uses, and the specification lists all of them.
3. Open **View in room** from the editor or a saved project. On a phone with ARKit or Google Play Services for AR, full-size AR opens full screen. A translucent model and a white outline of its real footprint follow the floor under the screen centre, facing the customer. Tap **Colour** to switch the main, feature-panel or detail laminate from swatches, or **Size** to change width, height and depth, at any time without losing the placement; changes made from the editor carry back to the design. Tap **Place here**, then drag to move it along the floor, use two fingers or **Turn 15°** to rotate, **Open doors** to see the interior and **Move** to place it again without restarting tracking. The on-screen hint explains limited tracking (moving too fast, low light). If Google Play Services for AR is missing or out of date, the app prompts to install it, and shows the reason with an install link and **Try again** if AR does not start. Phones that Google reports cannot run AR use **Live camera** / **Choose room photo** instead, where you tap to position the design and adjust its size by eye. In mobile Chrome, WebXR uses the same outline: tap to place, tap again to pick it up.
4. Name the project, optionally enter a salesperson's estimate including its currency, and save. Reopen the design from **Projects** or share its specification. Project records stay in local app storage.

## Model and material sources

`src/designs.ts` builds the feature walls, TV units, archways and designer wardrobes. Arches, discs, waves and glow frames are outlined shapes: three.js extrudes them, ViroReact draws them as polygons and the editor preview clips the laminate to them. Their catalog images are rendered from the same parts with `node --experimental-strip-types scripts/render-products.ts [product-key ...]`, which needs Playwright with Chromium.

`src/model.ts` defines the wardrobe as boards, shelves, rails, doors and pulls. Configuration dimensions use millimetres and geometry uses metres, with the origin at floor level. Both the preview and the native AR renderer consume those parts. The catalog cover is a separate rendered view of the default configuration.

The 18 sample images are crops from the supplied Meraki PVC laminates PDF, pages 9 (Luxury Aura, six wood samples) and 44 (Ultra Radiant, twelve samples), counting the cover as page 1. MRK codes identify the supplier products. The English color names are descriptive app labels. Screen color and cropped grain are approximate.

## Verification and remaining work

Run `npm test` for physical bounds, compartment and AR placement tests, `npm run check` for TypeScript, and `npx expo export --platform all` to bundle iOS, Android and web.

Before field use, verify detection, permission handling, placement scale and rotation on physical ARKit and ARCore devices against a measured reference. Account login, centralized project storage, customer approval, saved room composites, automated quotations and order administration remain future milestones.
