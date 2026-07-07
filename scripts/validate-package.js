const fs = require('node:fs')
const path = require('node:path')

const packageRoot = path.resolve(__dirname, '..')

const requiredFiles = [
  'package.json',
  'README.md',
  'LICENSE',
  'class-table/index.js',
  'class-table/index.json',
  'class-table/index.wxml',
  'class-table/index.wxss',
  'class-table/tool.wxs',
  'examples/weapp/package.json',
  'examples/weapp/project.config.json',
  'examples/weapp/miniprogram/components/class-table/index.js',
  'examples/weapp/miniprogram/components/class-table/index.wxml',
  'examples/weapp/miniprogram/pages/index/index.js',
  'examples/weapp/miniprogram/pages/index/index.wxml',
]

const forbiddenComponentPatterns = [
  /@\/utils/,
  /\.\.\/\.\.\/utils\/utils\.wxs\.js/,
  /ti-image/,
  /\.split\('\('\)\[0\]\.split\('（'\)\[0\]/,
]

function readTextFile(relativeFilePath) {
  return fs.readFileSync(path.join(packageRoot, relativeFilePath), 'utf8')
}

function assertRequiredFilesExist() {
  const missingFiles = requiredFiles.filter(relativeFilePath => {
    return !fs.existsSync(path.join(packageRoot, relativeFilePath))
  })

  if (missingFiles.length > 0) {
    throw new Error(`Missing required files:\n${missingFiles.join('\n')}`)
  }
}

function assertComponentHasNoProjectDependencies() {
  const componentFiles = [
    'class-table/index.js',
    'class-table/index.wxml',
    'class-table/tool.wxs',
  ]

  componentFiles.forEach(relativeFilePath => {
    const fileText = readTextFile(relativeFilePath)

    forbiddenComponentPatterns.forEach(pattern => {
      if (pattern.test(fileText)) {
        throw new Error(`Forbidden project dependency found in ${relativeFilePath}: ${pattern}`)
      }
    })
  })
}

function assertReadmeMentionsExample() {
  const readmeText = readTextFile('README.md')

  if (!readmeText.includes('examples/weapp')) {
    throw new Error('README must mention the traditional weapp example.')
  }
}

assertRequiredFilesExist()
assertComponentHasNoProjectDependencies()
assertReadmeMentionsExample()

console.log('weapp-class-table package validation passed.')
