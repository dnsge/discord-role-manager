# Discord Role Manager Worker

This directory contains the Cloudflare worker backend that handles Discord authorization and role assignment.

## Development

Run `npm install` to install required dependencies.

Run `npm run dev` to start the local API server. In `../frontend`, start the development server with `npm run dev`.

## Configuration

In `wrangler.toml`, the following vars are required:
1. `DISCORD_CLIENT_ID`: Discord Client ID for OAuth2
2. `GUILD_ID`: Discord Server Guild ID to interact with
3. `MODERATOR_ROLE_ID`: Role ID required for users to interact with API
4. `DISCORD_REDIRECT_URI`: Configured OAuth2 redirect URI for authorization callback
5. `CURRENT_MEMBER_ROLE_ID`: Role ID for "Current Member" role
6. `FORMER_MEMBER_ROLE_ID`: Role ID for "Former Member" role

Additionally, the following [secrets](https://developers.cloudflare.com/workers/configuration/secrets/) are required:
1. `DISCORD_BOT_TOKEN`: Bot token for Discord Application
2. `DISCORD_CLIENT_SECRET`: Discord Client Secret for OAuth2
3. `JWT_SECRET`: Secret used for signing/verifying JWTs for authorization in API
