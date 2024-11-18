import {spawn} from "child_process";
import { Readable } from "stream";
import { promisify } from "util";

import * as chai from 'chai';
import { Page } from 'puppeteer';
import { relative, resolve } from "path";
import { once } from "events";
import { access, constants, mkdir, readdir, rm, writeFile } from "fs/promises";


const baseDir = resolve(import.meta.dirname, "../");
const snapDir = resolve(baseDir, "fixtures", "__snapshots__");


const write_diff = !!JSON.parse(process.env["WRITE_DIFF"] || "0");
const write_new = !!JSON.parse(process.env["WRITE_NEW"] || "0");

/**
 * 
 * @param {string} name 
 */
function toFilename(name){
  return (name+(/\.png$/i.test(name)?"":".png")).replace(/[\s\/$]/g, "_");
}

/**
 * 
 * @param {string} name 
 */
function toPathname(name){
  return resolve(snapDir, toFilename(name));
}


/**
 * @param {Uint8Array} imgData 
 * @param {string} name 
 */
async function compare(imgData, name){
  let b = Buffer.allocUnsafe(0), stderr = "";
  let filename = toFilename(name);
  let pathname = toPathname(name);
  let diffFile = pathname.replace(/\.png$/, "_diff.png");
  let newFile = pathname.replace(/\.png$/, "_new.png");
  let child = spawn("compare", [
    "-fuzz", "1%",
    "-metric",  "PHASH",
    "-",
    pathname,
    "-"
  ], {
    stdio: ["pipe", "pipe", "pipe"],
  });

  child.on("spawn", ()=>{
    child.stdin.end(Buffer.from(imgData));
  });

  child.stdout.on("data", (d)=>{
    b = Buffer.concat([b, d]);
  });
  child.stderr.setEncoding("utf-8");
  child.stderr.on("data", (str)=>{
    stderr+=str;
  })

  let [code, signal] = await once(child, "close");
  if(signal) throw new Error("Image comparison was interrupted.");

  let written = false;
  if(code !=0 && process.env["OVERWRITE_SNAPSHOTS"]){
    written = true;
    await writeFile(pathname, imgData);
  }
  if(code == 2){
    try{
      await access(pathname, constants.R_OK);
      throw new Error(`Imagemagick error : ${stderr}`);
    }catch(e){
      if(!written) await writeFile(pathname, imgData);
      throw new Error(`Created new snapshot for "${name}". Please run tests again`);
    }
  }else if(code != 0){
    let diff = parseFloat(stderr.split("\n")[0]);

    if(!process.env["OVERWRITE_SNAPSHOTS"]){

      if(write_diff) await writeFile(diffFile, b);
      if(write_new) await writeFile(newFile, imgData);
    }
    return diff;
  }else{
    return 0;
  }
}



/**
 * @param {Chai.ChaiStatic} _chai
 * @param {Chai.ChaiUtils} utils
 */
function register(_chai, utils){
  const Assertion = _chai.Assertion
  utils.addMethod(Assertion.prototype, 'show', function (name, fuzz=1) {
    if(!name || typeof name !== "string") throw new Error("Expected a name string to match to. received "+name);
    //@ts-ignore
    const page = this._obj;
    if(!(page instanceof Page)) throw new Error(`Not a puppeteer page`);

    /**@type {import("puppeteer").ScreenshotOptions} */
    let opts = {encoding: 'binary', type: "png", optimizeForSpeed: true };
    /** @type {import("puppeteer").BoundingBox} */
    const bounds = utils.flag(this, "screenshot_bounds");
    if(bounds){
      opts.clip = bounds;
    }

    const selector = utils.flag(this, "screenshot_select");

    const promise = (async ()=>{
      let img = await( selector? (await page.locator(selector).waitHandle()).screenshot(): page.screenshot(opts));
      let diff = 0;
      try{
        diff = await compare(img, name);
      }catch(e){
        /**@ts-ignore */
        this.assert(false, e.message);
      }
      /**@ts-ignore */
      this.assert(
        diff < fuzz,
        `Screenshot does no match file at ${toPathname(name)}.`,
        `Screenshot should not match file at ${toPathname(name)}.`,
        `PHASH < ${fuzz}`, //expected
        `PHASH ${diff}`, //actual
      );
    })();
   this.then = promise.then.bind(promise);
   return this;
  });

  utils.addMethod(Assertion.prototype, "rect", function(bounds){
    const page = this._obj;
    if(!(page instanceof Page)) throw new Error(`Not a puppeteer page`);
    utils.flag(this, "screenshot_bounds", Object.assign(
      {x: 0, y:0, width: 800, height: 600},
      page.viewport(),
      bounds,
    ));
  });

  utils.addMethod(Assertion.prototype, "selector", function(selector){
    utils.flag(this, "screenshot_select", selector);
  })

}


chai.use(register);

//Global browser
export const mochaGlobalSetup = async function(){
  await mkdir(snapDir, {recursive: true});
  let files = await readdir(snapDir);
  for (let diff of files.filter(f=>/_(diff|new)\.png$/.test(f))){
    await rm(resolve(snapDir,diff));
  }
}
