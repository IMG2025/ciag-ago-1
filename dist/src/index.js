export function healthcheck() {
    return 'ciag-ago-1:ok';
}
if (process.argv.includes('--healthcheck')) {
    console.log(healthcheck());
}
