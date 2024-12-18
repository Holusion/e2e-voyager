import fs from "fs/promises";
import path from "path";

describe("Articles", function(){
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

  describe("Task", function(){
    this.beforeEach(async function(){
      await page.goto(`${this.story}?prompt=false&document=scene.svx.json&root=/`, { });
      await page.locator(`meta[name="model-loads"][content="1"]`).wait();
      await page.locator(`.sv-node-scene .sv-node-model`).click(); 
    });

    it("create an article", async function(){
      await page.locator(`sv-task-bar [role="button"][icon="article"]`).click();
      await page.locator(`sv-articles-task-view [role="button"][icon="create"]`).click();

      await page.locator(`sv-articles-task-view sv-article-list .ff-list-item`).wait();

      let editorHandle = await page.locator(`sv-article-editor iframe`).waitHandle();
      let editor = await editorHandle.contentFrame();
      expect(editor).to.be.ok;
      let titleHandle = await editor.locator("h1").waitHandle();
      let titleText = await titleHandle.evaluate((e)=>e.textContent);
      expect(titleText).to.equal("New Article");


      let urlText = await page.locator(`sv-articles-task-view .sv-detail-view [name="uri" i] input`).map(e=>e.value).wait();
      expect(urlText).to.match(/\.html$/);
      await this.request.get("/"+ urlText)
      .expect(200);
    });
  })

});
