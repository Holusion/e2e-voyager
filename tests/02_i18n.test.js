import fs from "fs/promises";
import path from "path";
import { setTimeout } from "timers/promises";

const fixtures = path.join(import.meta.dirname, "../fixtures/");


const match_scene_language = "voyager-explorer >>> .sv-chrome-view #language"
const match_scene_title = "voyager-explorer >>> .sv-chrome-view .sv-main-title";
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

  describe("with setup language", function(){
    this.beforeAll(async function(){
      let doc = JSON.parse(docString);
      doc.setups[0].language.language = "FR";
      doc.metas[0].collection.titles["FR"]= "Scène du Cube";

      await this.request.put("/scene-fr.svx.json")
      .send(JSON.stringify(doc))
      .expect(201);
    });

    it("use setup language", async function(){
      await page.goto(`${this.explorer}?prompt=false&document=scene-fr.svx.json`, {
        waitUntil: 'domcontentloaded',
      });
      await page.waitForFunction(()=>{
        return new Promise(resolve=>requestAnimationFrame(resolve));
      });

      //Verify matchers
      expect(await page.$$(match_scene_language)).to.have.property("length", 1);
      expect(await page.$$(match_scene_title)).to.have.property("length", 1);

      let lang = await page.$eval(match_scene_language, el=>el.textContent.trim());
      expect(lang).to.equal("FR");
      let title = await page.$eval(match_scene_title, el=>el.textContent.trim());
      expect(title).to.equal("Scène du Cube");
    });
    
    it("force another language", async function(){
      await page.goto(`${this.explorer}?prompt=false&document=scene-fr.svx.json&lang=EN`, {
        waitUntil: 'domcontentloaded',
      });
      await page.waitForFunction(()=>{
        return new Promise(resolve=>requestAnimationFrame(resolve));
      });
      let lang = await page.$eval(match_scene_language, el=>el.textContent.trim());
      expect(lang).to.equal("EN");
      let title = await page.$eval(match_scene_title, el=>el.textContent.trim());
      expect(title).to.equal("Cube Scene");
    });
  });

  describe("no setup language",function(){
    this.beforeAll(async function(){
      let doc = JSON.parse(docString);
      delete doc.setups[0].language;
      //Otherwise language choice isn't shown
      doc.metas[0].collection.titles["FR"]= "Scène du Cube";
      await this.request.put("/scene-nosetup.svx.json")
      .send(JSON.stringify(doc))
      .expect(201);

    });

    it("initializes in English by default", async function(){
      await page.goto(`${this.explorer}?prompt=false&document=scene-nosetup.svx.json`, {
        waitUntil: 'domcontentloaded',
      });
      await page.waitForFunction(()=>{
        return new Promise(resolve=>requestAnimationFrame(resolve));
      });
      let lang = await page.$eval(match_scene_language, el=>el.textContent.trim());
      expect(lang).to.equal("EN");
      let title = await page.$eval(match_scene_title, el=>el.textContent.trim());
      expect(title).to.equal("Cube Scene");
    });

    it("can be forced to initialize in french", async function(){
      await page.goto(`${this.explorer}?prompt=false&document=scene-nosetup.svx.json&lang=FR`, {
        waitUntil: 'domcontentloaded',
      });
      await page.waitForFunction(()=>{
        return new Promise(resolve=>requestAnimationFrame(resolve));
      });
      let lang = await page.$eval(match_scene_language, el=>el.textContent.trim());
      expect(lang).to.equal("FR");
      let title = await page.$eval(match_scene_title, el=>el.textContent.trim());
      expect(title).to.equal("Scène du Cube");
    });

  })
});