const {Client, Util} = require('discord.js')
const ytdl = require('ytdl-core')
const prefix = '!'
const YouTube = require('simple-youtube-api')
const youtube = new YouTube('AIzaSyAYGlod1nt7f-sfm7AWKqRoKnSwWh8TkaA')

const bot = new Client({disableEveryone:true})

bot.on('ready', async() => {
    console.log('ready')
})

bot.on('message', async message => {
    if(message.author.bot) return;
    if(message.channel.type === "dm") return;

    let messageArray = message.content.split(/\s+/g)
    let command = messageArray[0].toLowerCase()
    let args = messageArray.slice(1)

    if(!command.startsWith(prefix)) return

    if(command == `${prefix}play`) {
        const voiceChannel = message.member.voiceChannel
        if(!voiceChannel) return message.channel.send('You need to be in a voice channel')

        var url = args.join(' ')

        if(url.match(/^https?:\/\/(www.youtube.com|youtube.com)\/playlist(.*)$/)) {
            var playlist = await youtube.getPlaylist(url)
            var videos = await playlist.getVideos()
            for(i=0;i<videos.length;i++) {
                var video2 = await youtube.getVideoByID(videos[i].id)
                //console.log(video2)
                handleSong(video2, message, voiceChannel, true)
            }
        }
    }
})

bot.login('NDcyOTA5MDAxMzg3MTQ3MjY0.Dj6O0g.I7j30BSTX5jJzNcejjZOFuUHg0E')

async function handleSong(video, message, voiceChannel, playlist = false) {
    var song = {
        id: video.id,
        title: video.title,
        url: `https://youtube.com/watch?v=${video.id}`
    }
    console.log(song)
    if(!queueConstructor) {
        var queueConstructor = {
            connection: null,
            volume: 1,
            playing: false,
            songs: [],
        }
        queueConstructor.voiceChannel = voiceChannel

        try {
            var connection = await voiceChannel.join()
            queueConstructor.connection = connection
            queueConstructor.songs.push(song)
            play(song)
        } catch (err) {
            console.error(`couldnt join for some readon : ${err}`)
        }
        console.log(queueConstructor)
    } else {
        queueConstructor.songs.push(song)
    }
}

function play(song) {
    //console.log(queueConstructor.connection)
    if(!song) {
        queueConstructor.voiceChannel.leave()
        var queueConstructor = {
            connection: null,
            volume: 1,
            playing: false,
            songs: [],
        }
    }
    const dispatcher = queueConstructor.connection.playStream(ytdl(song.url)).on('end', reason => {
        if (reason === 'Stream is not generating quickly enough.') console.log('Song ended.');
        else console.log(reason);
        queueConstructor.songs.shift()
        play(queueConstructor.songs[0])
    }).on('error', error => console.error(error))
}