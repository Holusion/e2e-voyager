'use strict';

import fs from "fs/promises";
import path from "path";
import os from "os";
import { debuglog } from "util";

import puppeteer from "puppeteer";


const debug = debuglog("puppeteer");
const chromeArgs = [
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-renderer-backgrounding',
  '--no-sandbox',
];

const options = {
  headless: JSON.parse(process.env["HEADLESS"] || "1")?true:false,
  executablePath: process.env["PUPPETEER_EXEC_PATH"], // set by github action
  args: chromeArgs,
};


let timeout = parseInt(process.env["TIMEOUT"]);
if(Number.isNaN(timeout)){
  timeout = 2000;
}

const FILE = path.join(os.tmpdir(), 'voyager_e2e_pptr_wsEndpoint');


//Global browser
export const mochaGlobalSetup = async function(){
  this.browser = await puppeteer.launch(options);
  await fs.writeFile(FILE, this.browser.wsEndpoint());
}

export const mochaGlobalTeardown = async function(){
  await this.browser.close();
  await fs.unlink(FILE);
}

export const mochaHooks = {
  async beforeAll(){
    const wsEndpoint = await fs.readFile(FILE, {encoding:"utf8"});
    if (!wsEndpoint) {
      throw new Error('Puppeteer\'s wsEndpoint not found');
    }
    this._contexts = [];
    try{
      this.browser = await puppeteer.connect({browserWSEndpoint:wsEndpoint});
    }catch(e){
      console.error(e);
      throw new Error(`Failed to connect to puppeteer on ${wsEndpoint}: ${e.message}`);
    }

    const mainContext = await this.browser.createBrowserContext();
    this._contexts.push(mainContext);
    this.newPage = async (createContext = false)=>{
      let ctx = mainContext;
      if(createContext){
        ctx = await this.browser.createBrowserContext();
        this._contexts.push(ctx);
      }
      const page = await ctx.newPage();
      page.setDefaultTimeout(timeout);

      const dismissBeforeUnload = dialog =>
        dialog.type() === "beforeunload" && dialog.dismiss();
      page.on("dialog", dismissBeforeUnload);

      if(debug.enabled){
        page.on('console', msg => debug(msg.text()));
      }

      await page.evaluateOnNewDocument(() => {
        window.addEventListener('DOMContentLoaded', () => {
          let m = document.createElement("meta");
          m.name = "model-loads";
          m.content = "0";
          document.head.appendChild(m);
          let loads = 0;
          document.querySelector("voyager-explorer")?.addEventListener("model-load", ()=>{ m.content = (++loads).toString()});
        });
      });
      return page;
    }
  },
  async afterAll(){
    await Promise.all(this._contexts.map(async (ctx)=>{
      try{
        if(!ctx.closed) await ctx.close();
      }catch(e){
        console.warn("Failed to close puppeteer page. Do not close manually");
      }
    }));
    this.browser.disconnect();
  }
}