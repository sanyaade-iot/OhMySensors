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
- [x] Websocket API

The initial goal is to provide an API that would only allow to see the current state of sensors and interact with them in case of an actuator. 

![Reached](https://cdn3.iconfinder.com/data/icons/10con/512/checkmark_tick-16.png) Goal reached

In a second time, the API will be able to aggregate data of a sensor given a time period to generate graphs and charts. A GUI is the next logical step, and it would be completely separated from the server code (only client code using API).

Finally, I would like to implement some sort of event-based automation, starting with snippets of Javascript being able to respond to events, to ultimately create sort of an IFTT system, more user-friendly.
I am considering [embedding Node-RED](http://nodered.org/docs/embedding.html) as I don't want to reinvent the wheel.

## Usage

**Not available in npm yet**

Install it using `npm install -g ohmysensors`

Run it with `ohmysensors --configFile *config.json path* --dataDir *data path*`, the `--dataDir` is optional and defaults to `./data`. If a non-existent directory is provided, it will be created.

### config.json

An example `config.json` file named `config.example.json` is provided at the root of the repo.
If your gateway is a serial one, replace `ethernet` with `serial`, remove the `ip` and `port` keys and add a `path` key (example: `COM3` on Windows or `/dev/tty-usbserial1` on Linux).

You can also change the `units` value to `imperial` if you want to.

## Build a client

You would like to build a client on top of OhMySensors? There is an easy-to-use WebSocket API, see [the wiki](https://github.com/marvinroger/OhMySensors/wiki/API) for more informations.

## Technology

### Back-end

I wanted something future-ready, so OhMySensors is using pure-JS with Node. It uses some ES6 and even ES7 concepts like async-await which make some parts of the code very clean. It is still compatible with ES5 (Node 0.12) as it uses Babel to transform ES6/7 code to ES5, which slightly delays the startup (a few seconds).

It also makes use of SQLite because of its lightness and its ability to perform a read against thousands of records in a matter of milliseconds, which is a must to generate graphs/charts of the temperatures sent by the sensors, for example.

The API is a websocket one, so that clients can be notified of updates in real-time, which is also a must for an home automation system.

### Front-end

The front-end will use [jsblocks](http://jsblocks.com/), a new JS MVC framework. This is very easy to learn and allows server-side rendering, which is a great addition for low-end devices.

## A few words on the name

OhMySensors sounded good to me. Being french, "oh my gosh" is something we use to say a lot.
It also reminds of the home, as it sounds like "home I sensors", which also sounds like an Apple-ish product.

The logo of OhMySensors has a meaning. In french, "Oh" sounds like "eau", which means "water" in english. The logo looks like a drop, a reversed drop. The idea behind this is that, when you waste water for whatever reason (water leak, valve forgotten), the water flows down. But with home automation, this kind of situation can be avoided: that's why the water "flows up", this illustrates the benefits of home automation for the environment.
