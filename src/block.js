const {
  SyncHook,
  AsyncParallelHook
} = require('tapable')
const {isStringArray} = require('./utils')
const {
  FRIEND_SET_RESERVED_HOOKS_FACTORY,
  Hookable
} = require('./base/hookable')
const {
  FRIEND_GET_CONFIG_SETTING,
  FRIEND_SET_CONFIG_VALUE,
  FRIEND_SET_CAVIAR_OPTIONS,
  FRIEND_CREATE,
  FRIEND_RUN,

  PHASE_DEFAULT,

  createSymbol
} = require('./constants')

const {createError} = require('./error')

const error = createError('BLOCK')

// The performance of accessing a symbol property or a normal property
// is nearly the same
// https://jsperf.com/normal-property-vs-symbol-prop
const CONFIG_SETTING = createSymbol('config')
const CONFIG_VALUE = createSymbol('config-value')
// const IS_READY = Symbol('is-ready')
const HOOKS = createSymbol('hooks')
const OUTLET = createSymbol('outlet')
const CAVIAR_OPTS = createSymbol('caviar-opts')
const PHASES = createSymbol('phases')
const SHOULD_SKIP_PHASE = createSymbol('should-skip-phase')

const DEFAULT_HOOKS = () => ({
  // TODO: hooks paramaters
  // beforeBuild: new SyncHook(),
  // built: new SyncHook(),
  created: new SyncHook(['outlet', 'caviarOptions']),
  beforeRun: new AsyncParallelHook(['caviarOptions']),
  run: new AsyncParallelHook(['returnValue', 'caviarOptions']),
  config: new SyncHook(['config', 'caviarOptions'])
})

class Block extends Hookable {
  constructor () {
    super()

    this[CONFIG_SETTING] = null
    this[HOOKS] = null
    // this[IS_READY] = false

    this[CONFIG_VALUE] = null
    this[CAVIAR_OPTS] = null

    this[FRIEND_SET_RESERVED_HOOKS_FACTORY](DEFAULT_HOOKS)
  }

  // Set config settings
  set config (config) {
    // TODO: check config
    this[CONFIG_SETTING] = config
  }

  [FRIEND_GET_CONFIG_SETTING] () {
    return this[CONFIG_SETTING]
  }

  // The config chain is managed by caviar core
  [FRIEND_SET_CONFIG_VALUE] (value) {
    this[CONFIG_VALUE] = value
    this.hooks.config.call(value, this[CAVIAR_OPTS])
  }

  set phases (phases) {
    if (!isStringArray(phases)) {
      throw error('INVALID_PHASES', phases)
    }

    this[PHASES] = phases
  }

  [SHOULD_SKIP_PHASE] () {
    const {phase} = this.options
    // The phase is explicitly disabled in binder
    return phase === false
    // The block only supports the default phase,
    // and the phase is not default
    || (
      !this[PHASES]
      && phase !== PHASE_DEFAULT
    )
    // The phase is not supported by the block
    || this[PHASES].includes(phase)
  }

  [FRIEND_SET_CAVIAR_OPTIONS] (opts) {
    this[CAVIAR_OPTS] = opts
    Object.freeze(opts)
  }

  get options () {
    return this[CAVIAR_OPTS]
  }

  get outlet () {
    return this[OUTLET]
  }

  [FRIEND_CREATE] () {
    if (this[SHOULD_SKIP_PHASE]()) {
      return
    }

    const {options} = this

    const outlet = this.create(this[CONFIG_VALUE], options)
    this[OUTLET] = outlet
    this.hooks.created.call(outlet, options)
  }

  async [FRIEND_RUN] () {
    if (this[SHOULD_SKIP_PHASE]()) {
      return
    }

    const {options} = this
    await this.hooks.beforeRun.promise(options)
    const ret = await this.run(this[CONFIG_VALUE], options)
    await this.hooks.run.promise(ret, options)

    return ret
  }

  create () {
    throw error('NOT_IMPLEMENTED', 'create')
  }

  run () {
    throw error('NOT_IMPLEMENTED', 'run')
  }
}

module.exports = {
  Block
}
