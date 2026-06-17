import { execSync } from 'child_process'
import { join } from 'path/posix';

const user = process.env['DEPLOY_USER']!.trim()
const hostname = process.env['DEPLOY_HOSTNAME']!.trim()
const root = process.env['DEPLOY_ROOT']!.trim();

const origin = [user, hostname].join('@');

execSync([
    'ssh',
    origin,
    'systemctl --user stop dummy-bot.service',
].join(' '), {
    stdio: 'inherit'
});

execSync([
    'scp',
    JSON.stringify(join(import.meta.dirname.replace(/\\/g, '/'), './build/dummy')),
    [
        origin,
        ':',
        JSON.stringify(root)
    ].join(''),
].join(' '), {
    stdio: 'inherit',
})


execSync([
    'ssh',
    origin,
    'systemctl --user restart dummy-bot.service',
].join(' '), {
    stdio: 'inherit'
});
