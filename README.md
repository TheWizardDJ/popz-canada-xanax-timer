# PopZ Canada Xanax Flight Timer

An installable userscript for Torn that shows the recommended one-way Canada departure time for the latest confirmed Xanax restock. It includes a movable overlay, subscription status, and an optional one-minute departure alert.

## Install

Install the script from [Greasy Fork](https://greasyfork.org/) once the listing is live. The published script is [`popz-canada-xanax-timer.user.js`](./popz-canada-xanax-timer.user.js).

## Access and Subscription

Access is available to members of PopZ factions `36201` and `56889`. Active access requires one Xanax per week, sent to Torn ID `1800878` with the exact message `Xanax Flight Timer`.

## API Key and Data Use

Activation uses a custom Torn API key with only `user -> profile` access. The key verifies player identity and faction membership once, and is then discarded. The service stores player identity, faction eligibility, subscription expiry, and verified payment records. Details: <https://api.popz.world/xanax-timer/privacy.html>.

## Release Process

This repository contains only the public timer userscript. It intentionally excludes the server, database, owner-only stock-report importer, secrets, and deployment configuration.

Once Greasy Fork is connected, it synchronizes the userscript after pushes to `main`. Update `popz-canada-xanax-timer.user.js`, increment its `@version`, commit, and push. Keep the deployed copy at `CanadaXanaxTimer/public/install.user.js` synchronized with the released source.

## Requirements

- Tampermonkey, Violentmonkey, or TornPDA userscript support
- An approved PopZ faction membership
