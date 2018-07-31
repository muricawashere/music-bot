const {Client, Util} = require('discord.js')
const ytdl = require('ytdl-core')
const prefix = '!'
const YouTube = require('simple-youtube-api')
const youtube = new YouTube('AIzaSyAYGlod1nt7f-sfm7AWKqRoKnSwWh8TkaA')

const queue = new Map()

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
	const serverQueue = queue.get(message.guild.id);

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
        } else {
            try {
                var video = await youtube.getVideo(url)
            } catch (err) {
                try {
                    var videos = await youtube.searchVideos(url)
                    let index = 0

                    message.channel.send(`__**Song Selection**__
${videos.map(video2 => `**${++index} -** ${video2.title}`).join('\n')}
Respond with your selection`)
                    try {
                        var response = await message.channel.awaitMessages(msg2 => msg2.content > 0 && msg2 < 11, {
                            maxMatches: 1,
                            time: 10000,
                            errors: ['time']
                        })
                    } catch (err) {
                        return message.channel.send('Invalid response')
                    }
                    const videoIndex = parseInt(response.first().content)
                    var video = await youtube.getVideoByID(videos[videoIndex-1].id)
                } catch (err) {
                    return message.channel.send('Couldnt find any videos :(')
                }
            }
            return handleSong(video, message, voiceChannel)
        }
    }

    if(command == `${prefix}skip`) {
        if(!message.member.voiceChannel) return message.channel('You need to be in a voice channel')
        if(!serverQueue) return message.channel.send('Nothing is playing')
        serverQueue.connection.dispatcher.end('Skip command used')
        return undefined
    }
    if(command == `${prefix}stop`) {
        if(!message.member.voiceChannel) return message.channel.send('You are not in a voice channel')
        if(!serverQueue) return message.channel.send('There is nothing playing')
        serverQueue.songs = []
        serverQueue.connection.dispatcher.end('Stopped')
        return undefined
    }
    if(command == `${prefix}volume`) {
        if(!message.member.voiceChannel) return message.channel.send('Your arent in a voice channel')
        if(!serverQueue) return message.channel.send('There is nothing playing')
        if(!args[0]) return message.channel.send(`The current volume is: **${serverQueue.volume}**`)
        serverQueue.volume = args[0]/100
        if(args[0]>100||args[0]<1) return message.channel.send('Please set a volume from 1-100')
        serverQueue.connection.dispatcher.setVolumeLogarithmic(args[0]/100)
        return message.channel.send(`Volume set to: **${serverQueue.volume*100}**`)
    }
    if(command == `${prefix}np`) {
        if(!serverQueue) return message.channel.send('There is nothing playing')
        return message.channel.send(`Now playing: **${serverQueue.songs[0].title}**`)
    }
    if(command == `${prefix}queue`) {
        if(!serverQueue) return message.channel.send('There is nothing playing')
        return message.channel.send(`**Queue**
${serverQueue.songs.map(song=>`**-**${song.title}`).join('\n')}

**Now Playing: ${serverQueue.songs[0].title}`)
    }
    if(command == `${prefix}pause`) {
        if(serverQueue && serverQueue.playing) {
            serverQueue.playing = false
            serverQueue.connection.dispatcher.pause()
            return message.channel.send('Playback paused')
        }
        return message.channel.send('There is nothing playing')
    }
    if(command == `${prefix}resume`) {
        if(serverQueue && !serverQueue.playing) {
            serverQueue.playing = true
            serverQueue.connection.dispatcher.resume()
            return message.channel.send('Playback resumed')
        }
        return message.channel.send('There is nothing playing')
    }
})

bot.login('NDcyOTA5MDAxMzg3MTQ3MjY0.Dj6O0g.I7j30BSTX5jJzNcejjZOFuUHg0E')

async function handleSong(video, message, voiceChannel, playlist = false) {
    const serverQueue = queue.get(message.guild.id)
    var song = {
        id: video.id,
        title: video.title,
        url: `https://youtube.com/watch?v=${video.id}`
    }
    console.log(song)
    if(!serverQueue) {
        var queueConstructor = {
            connection: null,
            volume: 1,
            playing: false,
            songs: [],
        }
        queue.set(message.guild.id, queueConstructor)

        queueConstructor.songs.push(song)
        try {
            var connection = await voiceChannel.join()
            queueConstructor.connection = connection
            queueConstructor.voiceChannel = voiceChannel
            play(message.guild, queueConstructor.songs[0])
        } catch (err) {
            queue.delete(message.guild.id)
            console.error(`couldnt join for some readon : ${err}`)
        }
        console.log(queueConstructor)
    } else {
        serverQueue.songs.push(song)
        message.channel.send(`**${song.title}** has been added to the queue`)
    }
}

function play(guild, song) {
    const serverQueue = queue.get(guild.id)
    serverQueue.playing = true
    //console.log(queueConstructor.connection)
    if(!song) {
        console.log(serverQueue)
        serverQueue.voiceChannel.leave()
        queue.delete(guild.id)
        serverQueue.playing = false
        return
    }
    const dispatcher = serverQueue.connection.playStream(ytdl(song.url)).on('end', reason => {
        if (reason === 'Stream is not generating quickly enough.') console.log('Song ended.');
        else console.log(reason);
        console.log(serverQueue)
        serverQueue.songs.shift()
        play(guild, serverQueue.songs[0])
    }).on('error', error => console.error(error))
    dispatcher.setVolumeLogarithmic(serverQueue.volume)
}
