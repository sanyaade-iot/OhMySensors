# OhMySensors
[![Build Status](https://travis-ci.org/marvinroger/OhMySensors.svg)](https://travis-ci.org/marvinroger/OhMySensors) [![Dependency Status](https://david-dm.org/marvinroger/OhMySensors.svg)](https://david-dm.org/marvinroger/OhMySensors) [![devDependency Status](https://david-dm.org/marvinroger/OhMySensors/dev-status.svg)](https://david-dm.org/marvinroger/OhMySensors#info=devDependencies) [![Code Climate](https://codeclimate.com/github/marvinroger/OhMySensors/badges/gpa.svg)](https://codeclimate.com/github/marvinroger/OhMySensors) [![Test Coverage](https://codeclimate.com/github/marvinroger/OhMySensors/badges/coverage.svg)](https://codeclimate.com/github/marvinroger/OhMySensors/coverage)

![OhMySensors](http://i.imgur.com/XUL7epF.png "OhMySensors")

OhMySensors is my attempt at creating an home automation controller for [MySensors](http://www.mysensors.org/). I was not able to find a controller that supports every single aspect of the MySensors Protocol, other than the commercial Vera. So I decided to build my own cheapest (understand free) alternative. This project is in very early stage, and is only for now a personal project.

## Features and goals

- [x] Free
- [x] Multi-platform (Linux, Mac OS X, Windows)
- [ ] Support every single type of sensors/feature of MySensors
- [x] Compatible with multiple types of Gateway
  - [x] Ethernet Gateway
  - [x] Serial Gateway
- [x] Dependency-less (except npm modules)
- [ ] Websocket API

The initial goal is to provide an API that would only allow to see the current state of sensors and interact with them in case of an actuator. In a second time, the API will be able to aggregate data of a sensor given a time period to generate graphs and charts. Finally, I would like to implement some sort of event-based automation, starting with snippets of Javascript being able to respond to events, to ultimately create sort of an IFTT system, more user-friendly.

A GUI is the next logical step, and it would be completely separated from the server code (only using API).

## Usage

**Not available in npm yet**

Install it using `npm install -g ohmysensors`

Run it with `ohmysensors --configFile *config.json path* --dataDir *data path*`, the data directory containing the databases will be created if it doesn't exist.

### config.json

An example `config.json` file named `config.example.json` is provided at the root of the repo.
If your gateway is a serial one, replace `ethernet` with `serial`, remove the `ip` and `port` keys and add a `path` key (example: `COM3` on Windows or `/dev/tty-usbserial1` on Linux).

You can also change the `units` value to `imperial` if you want to.

## Technology

I wanted something future-ready, so OhMySensors is using pure-JS with Node. It uses some ES6 and even ES7 concepts like async-await which make some parts of the code very clean. It is still compatible with ES5 (Node 0.12) as it uses Babel to transform ES6/7 code to ES5.
It also makes use of SQLite because of its lightness and its ability to perform a read against thousands of records in a matter of milliseconds, which is a must to generate graphs of the temperature sent by the sensors, for example.
