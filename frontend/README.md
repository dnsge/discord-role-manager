# Discord Role Manager Frontend

This directory contains the React frontend for the Discord Role Manager application.

## Configuration

In `.env`, there are two requried variables:
1. `VITE_DISCORD_CLIENT_ID`: Discord Client ID for OAuth2 Authorization
2. `VITE_REDIRECT_URI`: Discord OAuth2 Redirect URI (Should be `http(s)://<path to app root>/login`)
