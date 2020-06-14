require('dotenv').config()
const { Client, Collection } = require('discord.js');
const fs = require('fs');
const cfg = require('./config.js');

///////////////////////////////////////////////////////////////////////////////

// bot client
const client = new Client();

// get config values.
client.config = {
    TOKEN: process.env.BOT_TOKEN,
    TRN_APIKEY: process.env.TRN_APIKEY,
    YOUTUBE_APIKEY: process.env.YOUTUBE_APIKEY,
    OWNER_ID: cfg.config.OWNER_ID,
    PREFIX: cfg.config.PREFIX,
    IGNORE_CHANNELS: cfg.config.IGNORE_CHANNELS,
    WELCOME_MESSAGE_CHANNEL: cfg.config.WELCOME_MESSAGE_CHANNEL
};
// let other files access config
exports.config = () => {
    return client.config;
}

// let other files access commands
exports.commands = () => {
    return client.commands;
}

// add all commands
client.commands = new Collection();
fs.readdir("./commands/", function(err, files){
    files.forEach(f => {
        const cmd = require(`./commands/${f}`);
        client.commands.push(cmd);
    });
});

///////////////////////////////////////////////////////////////////////////////

client.on("ready", () => {
    console.log("+--------------+");
    console.log("|  BOT ONLINE  |");
    console.log("+--------------+");
    console.log(`| commands: ${client.commands.length} |`);
    console.log(`| guilds:   ${client.guilds.array().length}  |`);
    console.log(`| channels: ${client.channels.array().length} |`);
    console.log("+--------------+");
    client.user.setActivity(client.config.PREFIX + "help");
});

client.on("guildMemberAdd", member => {
    var guild = member.guild;
    var channelToSend = null;

    // if guild has a specified channel to use for welcome message
    if(guild.id in client.config.WELCOME_MESSAGE_CHANNEL){
        var channelId = client.config.WELCOME_MESSAGE_CHANNEL[guild.id];
        channelToSend = guild.channels.get(channelId);
    }
    // otherwise use the first channel where the bot can send messages
    else{
        channelToSend = guild.channels.filter(c => c.type === "text"
                && c.permissionsFor(guild.client.user).has("SEND_MESSAGES"))
                    .sort((a, b) => a.position - b.position
                || Long.fromString(a.id).sub(Long.fromString(b.id)).toNumber())
                    .first();
    }
    const emoji = client.emojis.find("name", "feelsgoodman");
    channelToSend.send(`Welcome ${member.displayName}! ${emoji}`);
});

client.on("guildMemberRemove", member => {
    var guild = member.guild;
    var channelToSend = null;

    // if guild has a specified channel to use for welcome (and goodbye) messages
    if(guild.id in client.config.WELCOME_MESSAGE_CHANNEL){
        var channelId = client.config.WELCOME_MESSAGE_CHANNEL[guild.id];
        channelToSend = guild.channels.get(channelId);
    }
    // otherwise use the first channel where the bot can send messages
    else{
        channelToSend = guild.channels.filter(c => c.type === "text"
                && c.permissionsFor(guild.client.user).has("SEND_MESSAGES"))
                    .sort((a, b) => a.position - b.position
                || Long.fromString(a.id).sub(Long.fromString(b.id)).toNumber())
                    .first();
    }
    const emoji = client.emojis.find("name", "feelsbadman");
    channelToSend.send(`${member.displayName} has left us ${emoji}`);
});

client.on("messageReactionAdd", (reaction, user) => {
    if(reaction.emoji.id == "403289960884600832"    // "no"-emoji
            && reaction.message.author == client.user   // only the bot's messages
            && !user.bot){                          // only let humans react-delete
        reaction.message.delete()
            .then(msg => console.log("Deleted message by request from: "
                                    + user.username))
            .catch(console.error);
    }
});

client.on("message", msg => {
    // avoid spam channels
    if(client.config.IGNORE_CHANNELS.includes(msg.channel.id)) return;

    // log all messages read (not saved)
    var u = msg.author.username;
    var c = msg.channel.name;
    if(c == undefined) c = "private";
    var m = msg.content;
    console.log("[" + c + "] " + u + ": " + m);

    if(!m.startsWith(client.config.PREFIX)) return;
    var args = m.substring(client.config.PREFIX.length).split(" ");
    var cmdName = args[0].toLowerCase();

    client.commands.forEach(command => {
        if(cmdName === command.info.name || command.info.alias.includes(cmdName)){
            // guild or private chat check
            if(command.info.guildOnly && msg.channel.type === 'dm'){
                msg.channel.send("This command unavailable in private chat :^(");
                return;
            }

            // admin check
            if(command.info.permission == "admin"
                    && msg.author.id != client.config.OWNER_ID){
                msg.channel.send("Admin only command :^)");
            }else{
                command.execute(client, msg, args);
            }
        }
    });
});

///////////////////////////////////////////////////////////////////////////////

client.login(client.config.TOKEN);
