import fs from "fs/promises";
import path from "path";

describe("Annotations view", function(){
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


  it("toggles annotations", async function(){
    await page.goto(`${this.explorer}?prompt=false&document=scene.svx.json`, {
      waitUntil: 'load',
    });
    await page.locator(`meta[name="model-loads"][content="1"]`).wait();
    await page.$eval("voyager-explorer", ex =>{
      /**@ts-ignore  */
      ex.toggleAnnotations();
    });
    await page.waitForFunction(()=>{
      return new Promise(resolve=>requestAnimationFrame(resolve));
    });
    await expect(page).to.show("annotations");
  });

  it.skip('focus on annotation view', async function(){
    await page.locator(".sv-annotation .sv-title").click();
  });

});