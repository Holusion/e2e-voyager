
## Running tests

```
export DIST=/path/to/voyager/dist/
npm test
```

## Configuring

Configuration is done by setting env vars

### DIST

Dist folder of voyager to test against.


### DEV_BUILD

set to 1 to test against a dev build (`voyager-*-dev.html`)

### TIMEOUT

Configure Puppeteer locators default timeout.

Set this to a very long time together with `HEADLESS=false` to debug failing tests


### ECORPUS

set to 0 to disable tests that are specific to an eCorpus environment

### OVERWRITE_SNAPSHOTS

Rewrite snapshots as needed

### WRITE_DIFF

if set, Write a diff file showing where the screenshot and teh stored snapshot differed

### WRITE_NEW

if set, write the screenshot alongside the current snapshot

## Context

A [BrowserContext](https://pptr.dev/guides/browser-management#browser-contexts) is created for each `newPage` that is created.