export function getConfig() {
    return {
        token: process.env.DISCORD_DUMMY_BOT_TOKEN,
        client_id: process.env.DISCORD_DUMMY_BOT_CLIENT_ID,
        isProd: process.env.NODE_ENV === 'production' ? true : false
    } as const
}
