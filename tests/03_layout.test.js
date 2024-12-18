import fs from "fs/promises";
import path from "path";

describe("Layout testing", function(){
  /**@type {import("puppeteer").Page} */
  let page;
  this.beforeEach(async function(){
    await this.reset();
    page = await this.newPage(true);

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

  this.afterEach(async function(){
    await page.close({runBeforeUnload: false});
  });
  


  it("Settings tab collapse", async function(){
    // Select tab
    await page.locator(`[role="button"][text="Settings"]`).click();
    await page.locator(`.sv-task-panel .sv-panel-header ::-p-text(Settings)`).wait();
    // Select node
    await page.locator(`.sv-node-tree .sv-node-camera`).click();

    // 800x600 viewport is small enough to cause a collapse
    await expect(page).selector(`.sv-task-panel .sv-settings-tree .ff-tree-node[id^="Transform"]`).to.show("properties collapse to column");

    let splitter = await page.locator(`ff-dock-view ff-dock-strip + ff-splitter`).waitHandle();
    const box = await splitter.boundingBox();
    await page.mouse.move(box.x + box.width/2, box.y + box.height/2);
    await page.mouse.down()
    await page.mouse.move(370, box.y + box.height/2);
    await page.mouse.up();

    await expect(page).selector(`.sv-task-panel .sv-settings-tree .ff-tree-node[id^="Transform"]`).to.show("properties show as row");
  });
});