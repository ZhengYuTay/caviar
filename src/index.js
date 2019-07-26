const ConfigLoader = require('./config/loader')
const {monitor} = require('./sandbox/child-process')
const {requireModule} = require('./utils')
const {Block} = require('./block')
const Binder = require('./binder')
const Plugin = require('./plugin')
const Caviar = require('./caviar')
const {Sandbox} = require('./sandbox/parent')

const caviar = (options = {}) => options.sandbox
  ? new Sandbox(options)
  : new Caviar(options)

module.exports = {
  caviar,
  // Sandbox,
  // Caviar,
  Block,
  Binder,
  Plugin,
  ConfigLoader,
  utils: {
    monitor,
    requireModule
  }
}
