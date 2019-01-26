# Website and discord bot project for GTA V Role&nbsp;Play server

Website functionality includes:
- discord login and authentication system
- custom discord widget that displays list of currently online users
- widget that displays list of online players on server
- special pages for admin users
    - server logs preview
    - whitelist applications preview and management
    - managing of website admins
    - page visits statistics
- submitting of applications for whitelist
- image gallery
- Separate page for server rules

The design is fully responsive, written in SASS without any external libraries.

Discord bot abbilities:
- hangman game in private chat
- when user accept rules via giving reaction, bot gives this user a role so he can see more channels
- interactive to-do list
- displaying server status like list of online players
- server management via commands like: stop, start, restart, rcon
- notifications when someone sends whitelist application or when the application is accepted/rejected
- musicbot

Everythig above is single bot instance. Not multiple bots.