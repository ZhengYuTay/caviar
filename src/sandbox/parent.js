
const path = require('path')
const log = require('util').debuglog('caviar')
const {isString, isObject} = require('core-util-is')

const Block = require('../block')
const {createError} = require('../error')
// const {Lifecycle} = require('../lifecycle.no-track')
const {requireConfigLoader, joinEnvPaths} = require('../utils')

const error = createError('SANDBOX')

const ESSENTIAL_ENV_KEYS = [
  // For util.debug
  'NODE_DEBUG',
  // For userland debug module
  'DEBUG',
  // For `child_process.spawn`ers
  'PATH'
]

// Private env keys used by roe,
// which should not be changed by env plugins
const PRIVATE_ENV_KEYS = [
  'CAVIAR_CWD',
  'CAVIAR_DEV'
]

const createSetEnv = host => (key, value) => {
  if (value !== undefined) {
    host[key] = value
  }
}

const createInheritEnv = set => key => {
  if (PRIVATE_ENV_KEYS.includes(key)) {
    throw error('PRESERVED_ENV_KEY', key)
  }

  set(key, process.env[key])
}

const ensureEnv = inheritEnv => {
  ESSENTIAL_ENV_KEYS.forEach(inheritEnv)
}

// Sandbox is a special block that
// Sanitize and inject new environment variables into
// the child process
module.exports = class Sandbox extends Block {
  constructor (options) {
    super()

    if (!isObject(options)) {
      throw error('INVALID_OPTIONS', options)
    }

    const {
      caviarClassPath = path.join(__dirname, 'caviar.js'),
      configLoaderClassPath = path.join(__dirname, 'config-loader.js'),
      cwd,
      dev,
      port,
      stdio = 'inherit'
    } = options

    if (!isString(caviarClassPath)) {
      throw error('INVALID_SERVER_CLASS_PATH', caviarClassPath)
    }

    if (!isString(cwd)) {
      throw error('INVALID_CWD', cwd)
    }

    this._options = {
      caviarClassPath,
      configLoaderClassPath,
      cwd,
      dev: !!dev,
      port,
    }

    this._stdio = stdio

    this._configLoader = this._createConfigLoader()

    this._configLoader.load()
  }

  _createConfigLoader () {
    return new this.ConfigLoader({
      cwd: this._options.cwd
    })
  }

  get spawner () {
    return path.join(__dirname, '..', 'spawner', 'start.js')
  }

  get ConfigLoader () {
    return requireConfigLoader(
      this._options.configLoaderClassPath, error)
  }

  // ## Usage
  // ```js
  // const env = new Env({
  //   cwd,
  //   env: envConverter
  // })

  // const child = await env.spawn(command, args)
  // child.on('')
  // ```
  start (command, args, options = {}) {
    if (!options.stdio) {
      options.stdio = this._stdio
    }

    const {cwd} = this._options

    options.env = {
      ...this._env,
      CAVIAR_CWD: cwd
    }

    const {dev} = this._options

    if (dev) {
      options.env.CAVIAR_DEV = true
    }

    const setEnv = createSetEnv(options.env)
    const inheritEnv = createInheritEnv(setEnv)

    ensureEnv(inheritEnv)

    // TODO: a better solution
    // Just a workaround that webpack fails to compile babeled modules
    // which depends on @babel/runtime-corejs2
    options.env.NODE_PATH = joinEnvPaths(
      process.env.NODE_PATH,
      ...this._configLoader.getNodePaths()
    )

    const lifecycle = new Lifecycle({
      sandbox: true,
      configLoader: this._configLoader
    })

    lifecycle.applyPlugins()

    const sandbox = {
      inheritEnv,
      setEnv
    }

    // Apply sandbox env plugins
    await lifecycle.hooks.sandboxEnvironment.promise(sandbox, {
      cwd
    })

    log('spawn: %s %j', command, args)

    return spawn(command, args, options)
  }

  // For override
  _spawnArgs () {
    return [
      this.spawner,
      JSON.stringify(this._options)
    ]
  }
}
