/**
 * @description Telnet CLI for node.js applications
 * @author 0LEG0 <a.i.s@gmx.com>
 * @version 0.1.1
 * @license Apache-2.0
 * @see https://github.com/0LEG0/node-telnet-cli
 */
"use strict";

const telnet = require("telnet");
const net = require("net");
const readline = require("readline");

function connectionListener(c, listener) {
    let line = "";
    let prev = "";
    let cursor = 0;
    let a = "";
    let b = "";
    let history = [];
    let h = 0;
    const prompt = "# ";

    c.log = (...args) => {
        telnet.seq().left(prompt.length).clearRight.send(c);
        args.join(" ").split("\n").forEach(line => {telnet.seq().a(line).nextline.send(c)});
        telnet.seq().a(prompt).send(c);
    }

    telnet.cmd().IAC.WILL.echo.IAC.WILL.suppressGoAhead.send(c);
    readline.emitKeypressEvents(c);
    c.setEncoding("utf8");
    c.on("keypress", (key, code) => {
        //console.log("Keypress", key, code, "Code:", code.sequence.codePointAt(0));
        if (key && !code.ctrl && !code.meta && code.sequence.charCodeAt(0) !== 65533 && code.sequence.charCodeAt(0) > 31 && code.sequence.charCodeAt(0) !== 127) {
            a = line.substring(0, cursor);
            b = line.substring(cursor);
            prev = line = a + key + b;
            if (b.length > 0) {
                telnet.seq().a(key + b).left(b.length).send(c);
            } else {
                telnet.seq().a(key + b).send(c);
            }
            cursor++;
            //console.log("Type line=", a, key, "|", b, ", Cursor position=", cursor);
        }
        switch (code.name) {
            case "left":
                if (cursor <= 0) break;
                telnet.seq().left(1).send(c);
                cursor--;
                //console.log("Left line=", line, ", Cursor position=", cursor);
                break;
            case "right":
                if (cursor >= line.length) break;
                telnet.seq().right(1).send(c);
                cursor++;
                //console.log("Right line=", line, ", Cursor position=", cursor);
                break;
            case "backspace":
                if (cursor <= 0) break;
                cursor --;
                a = line.substring(0, cursor);
                b = line.substring(cursor + 1);
                line = a + b;
                //console.log("Backspace line=", a, "|", b, ", Cursor position=", cursor);
                if (b.length > 0) {
                    telnet.seq().left(1).clearRight.a(b).left(b.length).send(c);
                } else {
                    telnet.seq().left(1).clearRight.a(b).send(c);
                }
                break;
            case "delete":
                if (cursor >= line.length) break;
                a = line.substring(0, cursor);
                b = line.substring(cursor + 1);
                line = a + b;
                //console.log("Delete line=", a, "|", b, ", Cursor position=", cursor);
                if (b.length > 0) {
                    telnet.seq().clearRight.a(b).left(b.length).send(c);
                } else {
                    telnet.seq().clearRight.a(b).send(c);
                }
                break;
            case "tab":
                // Autocomplete
                c.emit("partline", line);
                break;
            case "enter":
            case "return":
                telnet.seq().nextline.a(prompt).send(c);
                //console.log("Line:", line);
                line = line.trim();
                c.emit("line", line);
                if (line !== "") history.push(line);
                h = history.length - 1;
                line = prev = "";
                cursor = 0;
                break;
            case "up":
                // History up
                telnet.seq().left(cursor + prompt.length).clearLine.send(c);
                line = (h > -1 && h < history.length) ? history[h] : prev;
                cursor = line.length;
                //console.log(`Up\nhistory.length = ${history.length}, history[${h}] = ${history[h]}\n, line = ${line}, prev = ${prev}, cursor = ${cursor}`);
                telnet.seq().a(prompt + line).send(c);
                h -= h > 0 ? 1 : 0;
                break;
            case "down":
                telnet.seq().left(cursor + prompt.length).clearLine.send(c);
                h++;
                if (h < history.length) {
                    line = h < history.length ? history[h] : prev;
                } else {
                    h--;
                    line = prev;
                }
                cursor = line.length;
                //console.log(`Down\nhistory.length = ${history.length}, history[${h}] = ${history[h]}\n, line = ${line}, prev = ${prev}, cursor = ${cursor}`);
                telnet.seq().a(prompt + line).send(c);
                break;
            case "d":
                if (code.ctrl) {
                    telnet.seq().nextline.bold.a("Goodbye!").normal.nextline.send(c);
                    c.end();
                }
        }
    });
    if (typeof listener == "function") listener(c);
    c.write(prompt);
}

function createServer(options = {}, customListener) {
    if (typeof options == "function") {
        customListener = options;
        options = {};
    }
    return net.createServer(options, (c) => {connectionListener(c, customListener)});
}

module.exports = { createServer };