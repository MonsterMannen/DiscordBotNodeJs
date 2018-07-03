const YTDL = require('ytdl-core');
const YTF = require('youtube-finder');
const main = require('./bot.js');
const Discord = require('discord.js');
const moment = require('moment');

// all servers with their play queues and audio providers
var guilds = {};

// youtube video searcher
const ytclient = YTF.createClient({key: main.config().YOUTUBE_APIKEY});

// methods //
exports.queueSong = (message, searchString) => {
    // get guild id
    var guildId = message.guild.id;

    // create guild object if it doesnt exist
    if(!guilds[guildId]) guilds[guildId] = {
        playQueue: [],
        nowPlaying: null
    };

    // get guild object
    var g = guilds[guildId];

    // search for song on youtube and get video id
    var params = {
        part: 'id',
        q: searchString,
        maxResults: 1,
        type: 'video'
    }
    ytclient.search(params, function(err, data) {
        //console.log("STRING:" + searchString + "\n---\n" + data);
        if(data.items.length == 0){
            message.channel.send("<:warning:408740166715310100> No song found");
            return;
        }
        var vidId = data.items[0].id.videoId;

        // get info about video
        YTDL.getInfo(vidId, (err, info) => {
            // fixing noob code
            var vidL = moment().startOf('day').seconds(info.length_seconds).format('mm:ss');
            if (info.length_seconds > 3600) {
              vidL = moment().startOf('day').seconds(info.length_seconds).format('HH:mm:ss');
            };
            
            var song = {
                id: vidId,
                title: vidId,
                length: vidL
            };
            if(!err) song.title = info.title;

            let ytVidUrl = "https://www.youtube.com/watch?v=" + song.id;
            let vidLcodeTags = "`" + song.length + "`";

            var embed = new Discord.RichEmbed()
                .setColor(9955331)
                .setDescription(`<:musical_note:408759580080865280> **Queued song:** [${song.title}](${ytVidUrl}) | ${vidLcodeTags}`);

            message.channel.send(embed);

            g.playQueue.push(song);
            console.log("--> Queued song: " + song.title + " (" + vidId + ")");

            // join voice channel if not in one already
            if(!message.guild.voiceConnection){
                message.member.voiceChannel.join().then((connection) => {
                    playSong(connection, guildId);
                    console.log("--> Joined voice channel: "
                                + message.member.voiceChannel.name);
                });
            }
        });
    });
};

function playSong(connection, guildId){
    var g = guilds[guildId];
    g.dispatcher = connection.playStream(YTDL(g.playQueue[0].id, {filter: "audioonly"}));
    console.log("--> Started playing song: " + g.playQueue[0].title
                                        + " (" + g.playQueue[0].id + ")");
    g.nowPlaying = g.playQueue[0];
    g.playQueue.shift();

    g.dispatcher.on("end", end => {
        console.log("--> Song ended");
        g.nowPlaying = null;
        if(g.playQueue[0]){
            // play next song if there are more in the Q
            playSong(connection, guildId);
        }else{
            // leave voice channel if last song
            connection.disconnect();
            console.log("--> Leaving voice channel: " + connection.channel.name);
        }
    });
}

exports.pauseSong = (guildId) => {
    if(!guilds[guildId]) return;
    var g = guilds[guildId];
    if(g.dispatcher) g.dispatcher.pause();
    console.log("--> Paused song");
};

exports.resumeSong = (guildId) => {
    if(!guilds[guildId]) return;
    var g = guilds[guildId];
    if(g.dispatcher) g.dispatcher.resume();
    console.log("--> Resumed song");
};

exports.skipSong = (guildId) => {
    if(!guilds[guildId]) return;
    var g = guilds[guildId];
    if(g.dispatcher) g.dispatcher.end();
};

exports.stopSong = (guildId) => {
    if(!guilds[guildId]) return;
    var g = guilds[guildId];
    // remove rest of songs or dispatcher onEnd will keep looping
    g.playQueue = [];
    if(g.dispatcher) g.dispatcher.end();
};

exports.playQueue = (guildId, channel) => {
    // check if something is playing
    if(!guilds[guildId] || !guilds[guildId].nowPlaying){
        var embed = new Discord.RichEmbed()
            .setColor(9955331)
            .setDescription("<:mute:456503709443293186> Not Playing");
        channel.send(embed);
        return;
    }

    var g = guilds[guildId];
    var q = "";
    var i = 1;
    let ytBaseUrl = "https://www.youtube.com/watch?v=";
    g.playQueue.forEach((song) => {
        let ytLink = ytBaseUrl + song.id;
        q += "`" + i++ + "`. ";
        q += `[${song.title}](${ytLink}) | `;
        q += "`" + song.length + "`\n";
    });

    var currSong = `[${g.nowPlaying.title}](${ytBaseUrl+g.nowPlaying.id}) | `;
    currSong += "`" + g.nowPlaying.length + "`";

    var embed = new Discord.RichEmbed()
        .setColor(9955331)
        .addField("<:musical_note:408759580080865280> Now Playing", currSong);
        if(q != "") embed.addField("<:notes:433601162827137026> Play Queue", q);

    channel.send(embed);
}
