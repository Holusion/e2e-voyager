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
    this._pages = [];
    try{
      this.browser = await puppeteer.connect({browserWSEndpoint:wsEndpoint});
    }catch(e){
      console.error(e);
      throw new Error(`Failed to connect to puppeteer on ${wsEndpoint}: ${e.message}`);
    }

    this.newPage = async ({ autoClose=true}={})=>{
      const page = await this.browser.newPage();
      page.setDefaultTimeout(timeout);
      if(autoClose) this._pages.push(page);

      return page;
    }
  },
  async afterAll(){
    await Promise.all(this._pages.map(async (page)=>{
      try{
        if(!page.isClosed) await page.close();
      }catch(e){
        console.warn("Failed to close puppeteer page. Do not close manually");
      }
    }));
    this.browser.disconnect();
  }
}