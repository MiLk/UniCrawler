# UniCrawler

There are some different parts:
- [API](api/README.md)
- Cli
- [Crawler](crawler/README.md)
- Web

## Requirements

* [Node.js](http://nodejs.org/)
* [Redis](http://redis.io/)
* [MongoDB](http://www.mongodb.org/)

## API

The API allow you to configure and control the crawling process.

## Cli

Some scripts to send request to the API.

## Crawler

Processing agent.
You can start more agent to speed up the process.

## Web

It's the WebUI. Don't forget to copy `config.dist.js` to `config.js` and setup the URL to you API.
