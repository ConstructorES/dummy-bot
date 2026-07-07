import { ChatInputCommandInteraction, Client, Events, GatewayIntentBits, GuildMember, Integration, REST, Routes, TextChannel, type CacheType, type PartialGuildMember } from 'discord.js';
import { initDb } from './db/db';
import { dirname, join } from 'path'

import { getConfig } from "./config.ts" with { type: "macro" };

const config = getConfig();

if (!config.token) throw new Error("No given token!");
if (!config.client_id) throw new Error("No given client ID!");

const root = config.isProd ? dirname(process.execPath) : process.cwd();

const db = initDb(join(root, 'dummy_db.sqlite'))
const api = new REST({ version: '10' }).setToken(config.token!);

type IDiscordBotCommands = {
    description: string,
    handler: <Cached extends CacheType = CacheType>(interaction: ChatInputCommandInteraction<Cached>) => Promise<void>
}

const commands = new Map<string, IDiscordBotCommands>([
    ['ping', {
        description: 'Replies with Pong!',
        handler: async (interaction) => {
            await interaction.reply('pong!')
        }
    }]
]);

async function bootstrap() {
    console.log('Starting Dummy bot...');

    try {

        const commandList: Array<{ name: string, description: string }> = []

        commands.forEach((cmd, name) => commandList.push({ name, description: cmd.description }))

        await api.put(Routes.applicationCommands(config.client_id!), {
            body: commandList
        });

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
}

let logged = false
setTimeout(() => {
    if (logged) return;

    console.error('Took to long to start bot!');
    exitHandler({ exit: true });
}, 30_000)

const bot = new Client<true>({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildModeration] });

bootstrap().then(async () => {
    bot.on(Events.ClientReady, () => {
        console.log(`Logged in as ${bot.user.tag}!`);
        logged = true
    });

    bot.on(Events.InteractionCreate, async (interaction) => {
        if (!interaction.isChatInputCommand()) return;

        const key = interaction.commandName;

        if (!commands.has(key)) return;

        await commands.get(key)!.handler(interaction)
    });

    bot.on(Events.MessageCreate, (message) => {
        // Honeypot channel
        if (message.channelId === '1516678629273370665') {
            if (!message.member) return;
            if (message.member.user.bot) return;
            if (!message.member.bannable) return;

            message.member.ban({
                reason: 'You shall not pass!',
                deleteMessageSeconds: 3600 // 1 hour
            })

            if (message.deletable) message.delete()

            channelGeneral.send(`${message.member.user.displayName} probó de la miel prohibida`);
            logger.send(`<@${message.member.user.id}> was banned due to honeypot detection`)

            return;
        }
    })

    const clankerKicksSchedules = new Map();

    async function refreshMember(member: GuildMember | PartialGuildMember) {
        return await member.guild.members.fetch({ user: member.user.id, force: true });
    }

    async function detectClanker(memberInfo: GuildMember | PartialGuildMember) {
        const userId = memberInfo.user.id;

        try {
            const member = await refreshMember(memberInfo);

            if (member.roles.cache.find((v) => v.name === 'Bot-Chan')) {
                // Already being kicked
                if (clankerKicksSchedules.has(userId)) return;
            } else { // Doesn't have role
                if (clankerKicksSchedules.has(userId)) {
                    clearTimeout(clankerKicksSchedules.get(userId))
                    clankerKicksSchedules.delete(userId);
                };
                return;
            }

            logger.send(`<@${userId}> wanted to be registered as a clanker`);

            member.send("You were registered as a *clanker*.\n\n**If you don't talk to an admin, you'll get kicked in 10 minutes**.");

            const timeout = setTimeout(async () => {
                clankerKicksSchedules.delete(userId);
                const member = await refreshMember(memberInfo);
                const botChanRole = member.roles.cache.find((v) => v.name === 'Bot-Chan');

                if (!botChanRole) return;

                if (member.kickable) member.kick('Filthy clanker!');

                logger.send(`<@${userId}> lived and died as an NPC`);
            }, 1000 * 60 * 10);

            clankerKicksSchedules.set(userId, timeout)
        } catch (error) {
            clankerKicksSchedules.delete(userId);
            clearTimeout(userId);
        }
    }

    bot.on(Events.GuildMemberUpdate, (member) => detectClanker(member));
    bot.on(Events.GuildMemberAdd, (member) => detectClanker(member));

    await bot.login(config.token!);

    const server = bot.guilds.cache.at(0);

    if (!server) throw new Error("Bot hasn't been invited to server");

    const channelGeneral = await server.channels.fetch('1284451924447461439') as TextChannel;
    const logger = await server.channels.fetch('1516670338329612288') as TextChannel; // Log channel
})

let cleaned = false;
async function exitHandler({
    cleanup = false,
    exit = false,
} = {}, exitCode?: number) {
    if (!cleaned) {
        console.log('Cleaning up...');

        try {
            db.close()
            await bot.destroy();
        } finally {
            cleaned = true;
        }
    }

    if (exitCode || exitCode === 0) console.log(exitCode);
    if (exit) process.exit();
}

// do something when app is closing
process.on('exit', exitHandler.bind(null, { cleanup: true }));

// catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, { exit: true }));

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler.bind(null, { exit: true }));
process.on('SIGUSR2', exitHandler.bind(null, { exit: true }));

// catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, { exit: true }));
