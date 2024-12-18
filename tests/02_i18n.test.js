import fs from "fs/promises";
import path from "path";
import timers from "timers/promises";

const fixtures = path.join(import.meta.dirname, "../fixtures/");


const match_scene_language = "voyager-explorer >>> .sv-chrome-view #language"
const match_scene_title = "voyager-explorer >>> .sv-chrome-view .sv-main-title";
describe("I18n", function(){

  let docString;
  this.beforeAll(async function(){
    await this.reset();
    await this.request.put("/cube.glb")
    .send(await fs.readFile(path.join(fixtures, "cube", "cube.glb")) )
    .expect(201);

    docString = await fs.readFile(path.join(fixtures, "cube", "scene.svx.json"));

  });

  describe("init", function(){
    /**@type {import("puppeteer").Page} */
    let page;
    
    this.beforeEach(async function(){
      page = await this.newPage();
    });

    this.afterEach(async function(){
      await page.close({runBeforeUnload: false});
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
        await page.locator(`meta[name="model-loads"][content="1"]`).wait();
  
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
        await page.locator(`meta[name="model-loads"][content="1"]`).wait();
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
        await page.locator(`meta[name="model-loads"][content="1"]`).wait();
        let lang = await page.$eval(match_scene_language, el=>el.textContent.trim());
        expect(lang).to.equal("EN");
        let title = await page.$eval(match_scene_title, el=>el.textContent.trim());
        expect(title).to.equal("Cube Scene");
      });
  
      it("can be forced to initialize in french", async function(){
        await page.goto(`${this.explorer}?prompt=false&document=scene-nosetup.svx.json&lang=FR`, {
          waitUntil: 'domcontentloaded',
        });
        await page.locator(`meta[name="model-loads"][content="1"]`).wait();
        let lang = await page.$eval(match_scene_language, el=>el.textContent.trim());
        expect(lang).to.equal("FR");
        let title = await page.$eval(match_scene_title, el=>el.textContent.trim());
        expect(title).to.equal("Scène du Cube");
      });
    });
  })


  describe("[eCorpus] don't switch back to \"DEFAULT_LANGUAGE\"", function(){
    /**@type {import("puppeteer").Page} */
    let page;
    
    this.beforeAll(async function(){
      let doc = JSON.parse(docString);
      doc.setups[0].language.language = "FR";
      doc.metas[0].collection.titles["FR"]= "Scène du Cube";
      doc.metas[0].collection.titles["DE"]= "Cube-Szene";
      await this.request.put("/scene-multi.svx.json")
      .send(JSON.stringify(doc))
      .expect(201);
      page = await this.newPage();
      await page.goto(`${this.story}?prompt=false&document=scene-multi.svx.json&root=/`, { });
      await page.locator(`meta[name="model-loads"][content="1"]`).wait();
      //We need the model to be selected for most tasks, so select it here
      await page.locator(`.sv-node-scene .sv-node-model`).click(); 
    });
    
    it("after creating an article", async function(){
      await page.locator(`sv-task-bar [role="button"][icon="article"]`).click();
      await page.locator(`sv-articles-task-view [role="button"][icon="create"]`).click();

      await page.locator(`sv-articles-task-view sv-article-list .ff-list-item`).wait();
      let lang = await page.$eval(match_scene_language, el=>el.textContent.trim());
      expect(lang).to.equal("FR");

      let editorHandle = await page.locator(`sv-article-editor iframe`).waitHandle();
      let editor = await editorHandle.contentFrame();
      expect(editor).to.be.ok;
      let titleHandle = await editor.locator("h1").waitHandle();
      let titleText = await titleHandle.evaluate((e)=>e.textContent);
      expect(titleText).to.equal("New Article");

      let urlText = await page.locator(`sv-articles-task-view .sv-detail-view [name="uri" i] input`).map(e=>e.value).wait();
      expect(urlText).to.match(/FR\.html$/);
    });

    it("after creating an annotation", async function(){
      await page.locator(`sv-task-bar [role="button"][icon="comment"]`).click();
      await page.locator(`sv-annotations-task-view [role="button"][icon="create"]`).click();

      await page.locator(`sv-annotations-task-view sv-annotation-list .ff-list-item`).wait();
      let lang = await page.$eval(match_scene_language, el=>el.textContent.trim());
      expect(lang).to.equal("FR");
    });

    it("after creating a tour", async function(){
      await page.locator(`sv-task-bar [role="button"][icon="globe"]`).click();
      await page.locator(`sv-tours-task-view [role="button"][icon="create"]`).click();

      await page.locator(`sv-tours-task-view sv-tour-list .ff-list-item`).wait();
      let lang = await page.$eval(match_scene_language, el=>el.textContent.trim());
      expect(lang).to.equal("FR");

    })
  })
});