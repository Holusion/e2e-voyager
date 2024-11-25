import fs from "fs/promises";
import path from "path";
import { setTimeout } from "timers/promises";

describe("Properties edition in Voyager Story", function(){
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
    await page.goto(`${this.story}?prompt=false&document=scene.svx.json`, {
      waitUntil: 'load',
    });
    await page.locator(`meta[name="model-loads"][content="1"]`).wait();
  });

  /*
   * Those test are sequential and shouldn't be run in isolation
   */

  it("Opens settings tab", async function(){
    // Select tab
    await page.locator(`[role="button"][text="Settings"]`).click();
    await page.locator(`.sv-task-panel .sv-panel-header ::-p-text(Settings)`).wait();
    // Select node
    await page.locator(`.sv-node-tree .sv-node-scene .ff-header`).click();
    await page.locator(`.sv-task-panel .sv-settings-tree .ff-tree-node[id^="orbit"]`).wait();
  });

  it("Edit a numeric Setting", async function(){
    await page.locator(`.sv-task-panel .sv-settings-tree .ff-tree-node[id^="orbit"] .sv-property[name="Y"] input`).fill("50");
    await expect(page).selector("voyager-explorer >>> canvas").to.show("cube rotated 50 canvas view");
  });

  it("Edit a color Setting", async function(){
    await page.locator( `.sv-task-panel .sv-settings-tree .ff-tree-node[id^="Background"] .ff-tree-node[id^="color0"] .sv-property-color [role="button"][title^="Color0"]`).click();
    await expect(page).rect({x:0, y:250, width:200, height: 350}).to.show("color-edit-swatch");
  });
});