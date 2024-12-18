import fs from "fs/promises";
import path from "path";
import timers from "node:timers/promises"

describe("Reload scene", function(){
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


  it("can reevaluate ExplorerApplication.props", async function(){
    await page.goto(`${this.explorer}?prompt=false`, {});
    await page.waitForFunction(async ()=>{
      await new Promise(resolve=>requestAnimationFrame(resolve));
      const explorer =document.querySelector("voyager-explorer");
      if(!explorer) return false;
      let here = new URL(window.location.href);
      here.searchParams.set("document", "scene.svx.json");
      window.history.pushState({}, null, here.toString());
      /** @ts-ignore */
      explorer.application.reloadDocument();
      return true;
    });
    let mainTitleHandle = await page.locator("voyager-explorer >>> .sv-chrome-view .sv-main-title").waitHandle();
    expect(await mainTitleHandle.evaluate(e=>e.textContent.trim())).to.equal("Cube Scene");
  });

});