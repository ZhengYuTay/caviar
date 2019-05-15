// This JavaScript file should be spawned with
// `node /path/to/spawner/start.js ${optionsJSON}`
const log = require('util').debuglog('caviar:spawner')
const {requireModule} = require('../src/utils')

const {
  // Pass `caviarClassPath` as an option,
  // so that user can extends `require('caviar').Caviar`,
  // and use spawner to start the own server
  caviarClassPath,
  ...options
} = JSON.parse(process.argv[2])

log('spawner env: %s', JSON.stringify(process.env, null, 2))

const Caviar = requireModule(serverClassPath)

new Server(options).ready()
.then(server => {
  server.listen().then(() => {
    console.log(`server started at http://localhost:${server.port}`)
  })
})
.catch(err => {
  console.error(`fails to start, reason:\n${err.stack}`)
  process.exit(1)
})
