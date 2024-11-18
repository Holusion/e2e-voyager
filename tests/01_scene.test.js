import fs from "fs/promises";
import path from "path";

describe("Open simple scenes", function(){
  /**@type {import("puppeteer").Page} */
  let page;
  this.beforeAll(async function(){
    await this.reset();
    page = await this.newPage();

    await Promise.all(["cube.glb", "scene.svx.json"].map(async f=>{
      await this.request.put("/"+f)
      .send(await fs.readFile(path.join(import.meta.dirname, "../fixtures/", "cube", f)) )
      .expect(201)
    }));

  });



  it("opens a document", async function(){
    await page.goto(`${this.explorer}?prompt=false&document=scene.svx.json`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForFunction(()=>{
      return new Promise(resolve=>requestAnimationFrame(resolve));
    });
    await expect(page).to.show("basic document");
  });

  it("opens a raw GLtf model", async function(){
    await page.goto(`${this.explorer}?prompt=false&model=cube.glb`, {waitUntil: "load"});
    await page.waitForFunction(()=>{
      return new Promise(resolve=>requestAnimationFrame(resolve));
    });
    await expect(page).to.show("single model");
  });

  it("toggles annotations", async function(){
    await page.goto(`${this.explorer}?prompt=false&document=scene.svx.json`, {
      waitUntil: 'load',
    });
    await page.$eval("voyager-explorer", ex =>{
      /**@ts-ignore  */
      ex.toggleAnnotations();
    });
    await page.waitForFunction(()=>{
      return new Promise(resolve=>requestAnimationFrame(resolve));
    });
    await expect(page).to.show("annotations");
  })

});