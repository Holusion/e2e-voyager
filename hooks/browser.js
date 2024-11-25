'use strict';

import fs from "fs/promises";
import path from "path";
import os from "os";

import puppeteer from "puppeteer";

const chromeArgs = [
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-renderer-backgrounding',
  '--no-sandbox',
];

const options = {
  headless: process.env["HEADLESS"] == "false"? false : true,
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

    this.newPage = async ()=>{
      const ctx = await this.browser.createBrowserContext();
      const page = await ctx.newPage();
      page.setDefaultTimeout(timeout);


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

      this._contexts.push(ctx);

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