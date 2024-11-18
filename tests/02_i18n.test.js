import fs from "fs/promises";
import path from "path";

const fixtures = path.join(import.meta.dirname, "../fixtures/");

describe("I18n features", function(){
  /**@type {import("puppeteer").Page} */
  let page;
  let docString;
  this.beforeAll(async function(){
    await this.reset();
    page = await this.newPage();
    await this.request.put("/cube.glb")
    .send(await fs.readFile(path.join(fixtures, "cube", "cube.glb")) )
    .expect(201);

    docString = await fs.readFile(path.join(fixtures, "cube", "scene.svx.json"));
  });

  describe("non-default scene language", function(){
    this.beforeAll(async function(){
      let doc = JSON.parse(docString);
      doc.setups[0].language.language = "FR";
      doc.metas[0].collection.titles["FR"]= "Scène du Cube";

      await this.request.put("/scene-fr.svx.json")
      .send(JSON.stringify(doc))
      .expect(201);
    });

    it("opens a document with non-default setup language", async function(){
      await page.goto(`${this.explorer}?prompt=false&document=scene-fr.svx.json`, {
        waitUntil: 'domcontentloaded',
      });
      await page.waitForFunction(()=>{
        return new Promise(resolve=>requestAnimationFrame(resolve));
      });
      await expect(page).rect({x:700, y:550, width:50, height: 50}).to.show("interface in french");
      await expect(page).rect({x:50, y:0, width:150, height: 50}).to.show("title in french");
    });
    
    it("opens with non-default language", async function(){
      await page.goto(`${this.explorer}?prompt=false&document=scene-fr.svx.json&lang=EN`, {
        waitUntil: 'domcontentloaded',
      });
      await page.waitForFunction(()=>{
        return new Promise(resolve=>requestAnimationFrame(resolve));
      });
      await expect(page).rect({x:700, y:550, width:50, height: 50}).to.show("interface in english");
      await expect(page).rect({x:50, y:0, width:150, height: 50}).to.show("title in english");
    });
  });
});