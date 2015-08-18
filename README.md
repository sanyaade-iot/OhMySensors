# OhMySensors [![Build Status](https://travis-ci.org/marvinroger/OhMySensors.svg)](https://travis-ci.org/marvinroger/OhMySensors) [![Code Climate](https://codeclimate.com/github/marvinroger/OhMySensors/badges/gpa.svg)](https://codeclimate.com/github/marvinroger/OhMySensors) [![Test Coverage](https://codeclimate.com/github/marvinroger/OhMySensors/badges/coverage.svg)](https://codeclimate.com/github/marvinroger/OhMySensors/coverage)

OhMySensors is my attempt at creating an home automation controller for [MySensors](http://www.mysensors.org/). I was not able to find a controller that supports every single aspect of the MySensors Protocol, other than the commercial Vera. So I decided to build my own cheapest (understand free) alternative. This project is in very early stage, and is only for now a personal project.

## Features and goals

- [x] Free
- [ ] Support every single type of sensors/feature of MySensors
- [x] Compatible with multiple types of Gateway
  - [x] Ethernet Gateway
  - [x] Serial Gateway
- [x] Dependency-less (except npm modules)
- [ ] Websocket API

The initial goal is to provide an API that would only allow to see the current state of sensors and interact with them in case of an actuator. In a second time, the API will be able to aggregate data of a sensor given a time period to generate graphs and charts. Finally, I would like to implement some sort of event-based automation, starting with snippets of Javascript being able to respond to events, to ultimately create sort of an IFTT system, more user-friendly.

A GUI is the next logical step, and it would be completely separated from the server code (only using API).
