const chalk = require('chalk'),
    fs = require('fs'),
    { join } = require('path'),
    moment = require('moment'),
    os = require('os'),
    //! You can change the colors of the console here.
    ConsoleColors = {
        info: chalk.rgb(3, 252, 48),
        debug: chalk.rgb(238, 59, 247),
        objects: chalk.rgb(255, 191, 0),
        arguments: chalk.rgb(255, 0, 242),
        green: chalk.rgb(0, 255, 0),
        red: chalk.rgb(255, 0, 0),
    }

var config = {
    Debug: false,
    showCallers: true
}

var splitter = '/'

const regexp = /\[[^\]]*\]/g;


if (!fs.existsSync('./logs')) {
    fs.mkdirSync('./logs')
}

exports.setDebug = function (debug) {
    config.Debug = debug;
}

Object.defineProperty(global, '__stack', {
    get: function () {
        var orig = Error.prepareStackTrace;
        Error.prepareStackTrace = function (_, stack) {
            return stack;
        };
        var err = new Error;
        Error.captureStackTrace(err, arguments.callee);
        var stack = err.stack;
        Error.prepareStackTrace = orig;
        return stack;
    }
});

Object.defineProperty(global, '__function', {
    get: function () {
        return __stack[2].getFileName().split(splitter)[__stack[2].getFileName().split(splitter).length - 1].replace('.js', '');
    }
});



if (os.platform().includes('win')) {
    console.log('Windows (%s) detected, using \\ as path splitter', os.platform())
    splitter = '\\'
};


function getFullDate() {
    return chalk.cyanBright(moment(Date.now()).format('DD/MM hh:mm:ss A'))
}



exports.Info = function (line, ...extras) {

    if (extras != null) {
        line.split('%s').forEach((ph, i) => {
            if (typeof extras[i] == 'object') {
                line = (line.replace('%s', ConsoleColors.objects(JSON.stringify(extras[i]))))
            } else line = (line.replace('%s', extras[i]))
        });
    }

    if (line.match(regexp)) {
        line.match(regexp).forEach((match) => {
            line = line.replace(match, ConsoleColors.arguments(match));
        })
    }

    console.log(`[${getFullDate()} ${ConsoleColors.info('INFO')}]  [${chalk.blue(__function)}] ${line}`)
    writeToFile('INFO', removeColors(line))
    line = null
    extras = null
}

exports.Debug = function (line, ...extras) {
    if (!config.Debug) return

    if (line == undefined || line == null) return

    if (typeof line == 'object') {
        console.log(line)
        return
    }

    if (line.match(regexp)) {
        line.match(regexp).forEach((match, i) => {
            line = line.replace(match, chalk.cyan(match));
        })
    }

    if (extras != null && extras.length > 0) {
        line.split('%s').forEach((ph, i) => {
            if (typeof extras[i] == 'object') {
                line = (line.replace('%s', ConsoleColors.objects(JSON.stringify(extras[i]))))
            } else line = (line.replace('%s', extras[i]))
        });
    }

    console.log(`[${getFullDate()} ${ConsoleColors.debug('DEBUG')}] [${chalk.blue(__function)}] ${line}`)
    writeToFile('DEBUG', removeColors(line))
    line = null
    extras = null
}

exports.Warn = function (line, ...extras) {

    if (extras != null && extras.length > 0) {
        line.split('%s').forEach((ph, i) => {
            if (typeof extras[i] == 'object') {
                line = (line.replace('%s', ConsoleColors.objects(extras[i])))
            } else line = (line.replace('%s', extras[i]))
        });
    }

    if (line.match(regexp)) {
        line.match(regexp).forEach((i, match) => {
            line = line.replace(match, chalk.cyan(match));
        })
    }

    console.log(`[${getFullDate()} ${chalk.yellow('WARN')}]  [${chalk.blue(__function)}] ${line}`)
    writeToFile('WARN', removeColors(line))
    line = null
    extras = null
}

exports.Error = function (line, ...extras) {

    if (extras != null && extras.length > 0) {
        line.split('%s').forEach((ph, i) => line = (line.replace('%s', extras[i])));
    }

    if (line.match(regexp)) {
        line.match(regexp).forEach((i, match) => {
            line = line.replace(match, chalk.cyan(match));
        })
    }

    console.log(`[${getFullDate()} ${chalk.red('ERROR')}] [${chalk.blue(__function)}] ${line}`)
    writeToFile('ERROR', removeColors(line))
    line = null
    extras = null
}


function writeToFile(Level, Line) {
    fs.appendFile(join(process.cwd() + '/logs/latest.log'), `[${removeColors(getFullDate())} ${Level}] ${removeColors(Line)} \n`, (err) => {
        if (err) {
            console.log(err)
        }
        Level = null
        Line = null
    })
}

exports.writeErr = function (Line) {
    if ('stack' in Line) {
        fs.appendFile(join(process.cwd() + '/logs/latest.log'), `[${removeColors(getFullDate())}]: ${Line.stack}\n`, (err) => {
            if (err) {
                console.log(err)
            }
            Line = null
        })
        return
    }

    fs.appendFile(join(process.cwd() + '/logs/latest.log'), `[${removeColors(getFullDate())}]: ${Line}\n`, (err) => {
        Line = null
    })
}


function removeColors(string) {
    return string.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
}

exports.renameAndExit = function () {
    if (fs.existsSync(join(process.cwd(), 'Logs', 'latest.log'))) {
        fs.rename(join(process.cwd(), 'Logs', 'latest.log'), join(process.cwd(), 'Logs', `log-${moment(Date.now()).format('d-MM-yy')}-${Date.now()}.log`), (err) => {
            if (err) {
                console.log(err);
            }

            process.exit(0);
        })
    } else {
        process.exit(0)
    }
}