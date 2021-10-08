# Warzone Stats
Discord bot for calculating aggregate player stats for Call of Duty Warzone.

## Admin - Install bot

### Add bot to server

### Create role administrator

`!wz role_admin @ROLE_ADMIN`

This command generate automaticly slash commands for guild.

### Create role player

`/role-player @ROLE_PLAYER`

### Create 3 channels

- Public channel for **info** and **rules**
- Private channel *@ROLE_PLAYER* for player set commands stats
- Private channel *@ROLE_PLAYER* only read for track

### Define channel info

`/channel-info @CHANNEL_INFO`

This command create automaticly a message infomation and rules. If user clic to reaction to accept, the bot attribut @ROLE_PLAYER to user to display private channels

### Define channel track

`/channel-track @CHANNEL_TRACK`


---
## Player - Commands

### Register

For register to bot use :

`/register PLATFORM USERNAME`

### Unregister

For unregister to bot use :

`/unregister`

### Change player

For change player information use 

`/change-player PLATFORM USERNAME`

### Track

If you want track to use 

`/track`

### Untrack

For untrack use 

`/untrack`

### Stats

For your stats use 

`/stats me`

For stats a player use

`/stats player @PLAYER`